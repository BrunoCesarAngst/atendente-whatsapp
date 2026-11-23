import assert from 'node:assert/strict'
import test from 'node:test'

import { barbershopConfig } from '../../src/barbershop/config.ts'
import { createBookingJourneyEngine } from '../../src/conversation/booking-engine.ts'
import { ConversationOrchestrator } from '../../src/conversation/orchestrator.ts'
import { InMemoryConversationRepository } from '../../src/persistence/in-memory-conversation-repository.ts'

const receivedAt = '2026-10-08T12:00:00.000Z'
const date = '2026-10-09'
const slot = `${date}T09:00:00-03:00`

function input(customerId: string, messageId: string, action: string) {
  return {
    businessId: barbershopConfig.id,
    customerId,
    messageId,
    receivedAt,
    interactiveId: action,
  }
}

function createSubject() {
  const repository = new InMemoryConversationRepository()
  const engine = createBookingJourneyEngine(repository, barbershopConfig)
  return { repository, orchestrator: new ConversationOrchestrator(repository, engine) }
}

test('percorre a jornada de reserva e confirma uma única vez', async () => {
  const { repository, orchestrator } = createSubject()

  assert.equal((await orchestrator.handle(input('customer-a', '1', 'booking:start')))[0]?.type, 'list')
  assert.equal((await orchestrator.handle(input('customer-a', '2', 'service:haircut')))[0]?.type, 'buttons')
  assert.equal((await orchestrator.handle(input('customer-a', '3', `date:${date}`)))[0]?.type, 'list')

  const review = await orchestrator.handle(input('customer-a', '4', `slot:${slot}`))
  assert.equal(review[0]?.type, 'buttons')

  const confirmed = await orchestrator.handle(input('customer-a', '5', 'booking:confirm'))
  assert.deepEqual(confirmed, [{ type: 'text', text: 'Seu horário está confirmado para 09:00 em 09/10/2026.' }])
  assert.equal((await repository.listAppointments(barbershopConfig.id)).length, 1)

  assert.deepEqual(await orchestrator.handle(input('customer-a', '5', 'booking:confirm')), [])
  assert.equal((await repository.listAppointments(barbershopConfig.id)).length, 1)
})

test('não confirma duas reservas para o mesmo profissional e horário', async () => {
  const { orchestrator } = createSubject()

  for (const customerId of ['customer-a', 'customer-b']) {
    await orchestrator.handle(input(customerId, `${customerId}-1`, 'booking:start'))
    await orchestrator.handle(input(customerId, `${customerId}-2`, 'service:haircut'))
    await orchestrator.handle(input(customerId, `${customerId}-3`, `date:${date}`))
    await orchestrator.handle(input(customerId, `${customerId}-4`, `slot:${slot}`))
  }

  const [first, second] = await Promise.all([
    orchestrator.handle(input('customer-a', 'customer-a-5', 'booking:confirm')),
    orchestrator.handle(input('customer-b', 'customer-b-5', 'booking:confirm')),
  ])

  assert.equal(first[0]?.type, 'text')
  assert.deepEqual(second, [{
    type: 'text',
    text: 'Esse horário acabou de ser reservado. Escolha outro horário, por favor.',
  }])
})

test('não confirma simultaneamente horários sobrepostos para o mesmo profissional', async () => {
  const { repository, orchestrator } = createSubject()
  const overlappingSlot = `${date}T09:30:00-03:00`

  for (const [customerId, selectedSlot] of [
    ['customer-a', slot],
    ['customer-b', overlappingSlot],
  ] as const) {
    await orchestrator.handle(input(customerId, `${customerId}-1`, 'booking:start'))
    await orchestrator.handle(input(customerId, `${customerId}-2`, 'service:haircut'))
    await orchestrator.handle(input(customerId, `${customerId}-3`, `date:${date}`))
    await orchestrator.handle(input(customerId, `${customerId}-4`, `slot:${selectedSlot}`))
  }

  const [first, second] = await Promise.all([
    orchestrator.handle(input('customer-a', 'customer-a-5', 'booking:confirm')),
    orchestrator.handle(input('customer-b', 'customer-b-5', 'booking:confirm')),
  ])

  assert.deepEqual(first, [{
    type: 'text',
    text: 'Seu horário está confirmado para 09:00 em 09/10/2026.',
  }])
  assert.deepEqual(second, [{
    type: 'text',
    text: 'Esse horário acabou de ser reservado. Escolha outro horário, por favor.',
  }])
  assert.equal((await repository.listAppointments(barbershopConfig.id)).length, 1)
})
