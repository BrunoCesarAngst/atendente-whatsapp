import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ConversationOrchestrator,
  type ConversationInput,
  type JourneyEngine,
} from '../../src/conversation/orchestrator.ts'
import { createConversationState } from '../../src/conversation/state.ts'
import { InMemoryConversationRepository } from '../../src/persistence/in-memory-conversation-repository.ts'

const input: ConversationInput = {
  businessId: 'barbearia-central',
  customerId: 'customer-key',
  messageId: 'wamid.1',
  receivedAt: '2026-10-08T12:00:00.000Z',
  text: 'oi',
}

test('cria estado explícito para uma conversa nova', () => {
  assert.deepEqual(
    createConversationState(
      'barbearia-central',
      'customer-key',
      '2026-10-08T12:00:00.000Z',
    ),
    {
      businessId: 'barbearia-central',
      customerId: 'customer-key',
      currentJourney: 'none',
      currentStep: 'start',
      mode: 'automation',
      context: {},
      createdAt: '2026-10-08T12:00:00.000Z',
      updatedAt: '2026-10-08T12:00:00.000Z',
    },
  )
})

test('orquestrador persiste a transição produzida por uma jornada', async () => {
  const repository = new InMemoryConversationRepository()
  const engine: JourneyEngine = {
    async handle(state) {
      return {
        state: {
          ...state,
          currentJourney: 'welcome',
          currentStep: 'offered_actions',
        },
        responses: [{
          type: 'buttons',
          text: 'Como posso ajudar?',
          options: [{ id: 'booking:start', label: 'Agendar horário' }],
        }],
      }
    },
  }
  const orchestrator = new ConversationOrchestrator(repository, engine)

  const responses = await orchestrator.handle(input)
  const saved = await repository.get(input.businessId, input.customerId)

  assert.equal(responses[0]?.type, 'buttons')
  assert.equal(saved?.currentJourney, 'welcome')
  assert.equal(saved?.updatedAt, input.receivedAt)
})

test('modo humano bloqueia a execução automática da jornada', async () => {
  const repository = new InMemoryConversationRepository()
  await repository.save({
    ...createConversationState(input.businessId, input.customerId, input.receivedAt),
    mode: 'human',
  })
  let wasCalled = false
  const orchestrator = new ConversationOrchestrator(repository, {
    async handle() {
      wasCalled = true
      throw new Error('não deveria executar')
    },
  })

  assert.deepEqual(await orchestrator.handle(input), [])
  assert.equal(wasCalled, false)
})
