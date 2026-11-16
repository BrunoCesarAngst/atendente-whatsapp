import type { BusinessConfig } from '../businesses/config.ts'
import type { ConversationRepository } from '../persistence/conversation-repository.ts'
import { createBookingJourneyEngine } from './booking-engine.ts'
import type { JourneyEngine } from './orchestrator.ts'
import { createRequestJourneyEngine } from './request-engine.ts'

export function createJourneyEngine(
  repository: ConversationRepository,
  config: BusinessConfig,
): JourneyEngine {
  return config.mode === 'appointment'
    ? createBookingJourneyEngine(repository, config)
    : createRequestJourneyEngine(repository, config)
}
