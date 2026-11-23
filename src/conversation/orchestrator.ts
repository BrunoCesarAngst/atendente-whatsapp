import { conversationSteps, type OperationalLogger } from '../logging/logger.ts'
import type { ConversationResponse } from './responses.ts'
import {
  createConversationState,
  type ConversationState,
} from './state.ts'
import type { ConversationRepository } from '../persistence/conversation-repository.ts'

export type ConversationInput = {
  businessId: string
  customerId: string
  messageId: string
  receivedAt: string
  text?: string
  interactiveId?: string
}

export type JourneyResult = {
  state: ConversationState
  responses: ConversationResponse[]
}

export interface JourneyEngine {
  handle(
    state: ConversationState,
    input: ConversationInput,
    log?: OperationalLogger,
  ): Promise<JourneyResult>
}

export type { ConversationRepository } from '../persistence/conversation-repository.ts'

export class ConversationOrchestrator {
  private readonly repository: ConversationRepository
  private readonly journeyEngine: JourneyEngine

  constructor(
    repository: ConversationRepository,
    journeyEngine: JourneyEngine,
  ) {
    this.repository = repository
    this.journeyEngine = journeyEngine
  }

  async handle(input: ConversationInput, log?: OperationalLogger): Promise<ConversationResponse[]> {
    const claimed = await this.repository.claimMessage(
      input.businessId,
      input.customerId,
      input.messageId,
    )

    if (!claimed) {
      log?.('message_duplicate', 'ignored')
      return []
    }

    const existing = await this.repository.get(
      input.businessId,
      input.customerId,
    )
    const state = existing ?? createConversationState(
      input.businessId,
      input.customerId,
      input.receivedAt,
    )

    log?.(existing ? 'conversation_loaded' : 'conversation_started', 'success')
    if (state.mode === 'human') {
      log?.('conversation_human_mode', 'ignored')
      return []
    }

    const result = await this.journeyEngine.handle(state, input, log)

    await this.repository.save({
      ...result.state,
      businessId: state.businessId,
      customerId: state.customerId,
      updatedAt: input.receivedAt,
    })

    const step = result.state.currentStep.startsWith('field:') ? 'collecting' : result.state.currentStep
    log?.('conversation_saved', 'success', {
      step: Object.hasOwn(conversationSteps, step) ? step as keyof typeof conversationSteps : undefined,
    })
    return result.responses
  }
}
