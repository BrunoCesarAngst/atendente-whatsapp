import assert from 'node:assert/strict'
import test from 'node:test'

import { gardeningConfig, poolCleaningConfig } from '../../src/businesses/profiles.ts'
import { createRequestJourneyEngine } from '../../src/conversation/request-engine.ts'
import { ConversationOrchestrator } from '../../src/conversation/orchestrator.ts'
import { InMemoryConversationRepository } from '../../src/persistence/in-memory-conversation-repository.ts'

const receivedAt = '2026-11-16T12:00:00.000Z'

function createSubject(config: typeof poolCleaningConfig | typeof gardeningConfig) {
  const repository = new InMemoryConversationRepository()
  return {
    repository,
    orchestrator: new ConversationOrchestrator(
      repository,
      createRequestJourneyEngine(repository, config),
    ),
  }
}

function action(
  businessId: string,
  customerId: string,
  messageId: string,
  interactiveId: string,
) {
  return { businessId, customerId, messageId, receivedAt, interactiveId }
}

function text(
  businessId: string,
  customerId: string,
  messageId: string,
  body: string,
) {
  return { businessId, customerId, messageId, receivedAt, text: body }
}

test('registra pedido de limpeza de piscina e transfere a conversa para modo humano', async () => {
  const { repository, orchestrator } = createSubject(poolCleaningConfig)
  const customerId = 'pool-customer'

  assert.equal((await orchestrator.handle(action(poolCleaningConfig.id, customerId, '1', 'request:start')))[0]?.type, 'list')
  assert.equal((await orchestrator.handle(action(poolCleaningConfig.id, customerId, '2', 'service:pool-cleaning')))[0]?.type, 'buttons')
  assert.equal((await orchestrator.handle(action(poolCleaningConfig.id, customerId, '3', 'field:frequency:one-off')))[0]?.type, 'text')
  assert.equal((await orchestrator.handle(text(poolCleaningConfig.id, customerId, '4', 'Centro')))[0]?.type, 'buttons')

  const confirmation = await orchestrator.handle(
    action(poolCleaningConfig.id, customerId, '5', 'field:preferred_period:this-week'),
  )

  assert.match((confirmation[0] as { text?: string } | undefined)?.text ?? '', /registrado/i)
  assert.deepEqual(await repository.listServiceRequests(poolCleaningConfig.id), [{
    id: 'service-request-1',
    businessId: poolCleaningConfig.id,
    customerId,
    serviceId: 'pool-cleaning',
    details: { frequency: 'one-off', neighborhood: 'Centro', preferred_period: 'this-week' },
    status: 'pending',
    createdAt: receivedAt,
  }])
  assert.equal((await repository.get(poolCleaningConfig.id, customerId))?.mode, 'human')
  assert.deepEqual(await orchestrator.handle(text(poolCleaningConfig.id, customerId, '6', 'obrigado')), [])
})

test('registra pedido de jardinagem com perguntas próprias sem criar reserva', async () => {
  const { repository, orchestrator } = createSubject(gardeningConfig)
  const customerId = 'garden-customer'

  await orchestrator.handle(action(gardeningConfig.id, customerId, '1', 'request:start'))
  await orchestrator.handle(action(gardeningConfig.id, customerId, '2', 'service:lawn-mowing'))
  await orchestrator.handle(text(gardeningConfig.id, customerId, '3', 'Bela Vista'))
  await orchestrator.handle(action(gardeningConfig.id, customerId, '4', 'field:area_size:medium'))
  await orchestrator.handle(action(gardeningConfig.id, customerId, '5', 'field:preferred_period:next-week'))

  const requests = await repository.listServiceRequests(gardeningConfig.id)
  assert.equal(requests.length, 1)
  assert.deepEqual(requests[0]?.details, {
    neighborhood: 'Bela Vista',
    area_size: 'medium',
    preferred_period: 'next-week',
  })
  assert.equal((await repository.listAppointments(gardeningConfig.id)).length, 0)
})

test('ignora reentrega que tentaria criar uma segunda solicitação', async () => {
  const { repository, orchestrator } = createSubject(poolCleaningConfig)
  const customerId = 'duplicate-customer'

  await orchestrator.handle(action(poolCleaningConfig.id, customerId, '1', 'request:start'))
  await orchestrator.handle(action(poolCleaningConfig.id, customerId, '2', 'service:pool-cleaning'))
  await orchestrator.handle(action(poolCleaningConfig.id, customerId, '3', 'field:frequency:one-off'))
  await orchestrator.handle(text(poolCleaningConfig.id, customerId, '4', 'Centro'))
  await orchestrator.handle(action(poolCleaningConfig.id, customerId, '5', 'field:preferred_period:this-week'))

  assert.deepEqual(
    await orchestrator.handle(action(poolCleaningConfig.id, customerId, '5', 'field:preferred_period:this-week')),
    [],
  )
  assert.equal((await repository.listServiceRequests(poolCleaningConfig.id)).length, 1)
})
