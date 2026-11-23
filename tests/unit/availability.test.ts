import assert from 'node:assert/strict'
import test from 'node:test'

import { barbershopConfig } from '../../src/barbershop/config.ts'
import { AvailabilityService } from '../../src/conversation/availability.ts'
import { InMemoryConversationRepository } from '../../src/persistence/in-memory-conversation-repository.ts'

test('não oferece intervalos que se sobrepõem e mantém horários adjacentes', async () => {
  const repository = new InMemoryConversationRepository()
  const availability = new AvailabilityService(repository, barbershopConfig)

  const before = await availability.listSlots('2026-10-09', 'haircut')
  assert.ok(before.includes('2026-10-09T09:00:00-03:00'))

  await repository.confirmAppointment({
    businessId: barbershopConfig.id,
    customerId: 'customer-a',
    serviceId: 'haircut',
    professionalId: barbershopConfig.professional.id,
    startsAt: '2026-10-09T09:00:00-03:00',
    priceInReais: 45,
    durationMinutes: 45,
  })

  const after = await availability.listSlots('2026-10-09', 'haircut')
  assert.ok(!after.includes('2026-10-09T09:00:00-03:00'))
  assert.ok(!after.includes('2026-10-09T09:30:00-03:00'))
  assert.ok(after.includes('2026-10-09T10:00:00-03:00'))
})
