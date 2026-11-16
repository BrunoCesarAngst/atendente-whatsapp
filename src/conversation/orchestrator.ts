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

  async handle(input: ConversationInput): Promise<ConversationResponse[]> {
    const claimed = await this.repository.claimMessage(
      input.businessId,
      input.customerId,
      input.messageId,
    )

    if (!claimed) {
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

    if (state.mode === 'human') {
      return []
    }

    const result = await this.journeyEngine.handle(state, input)

    await this.repository.save({
      ...result.state,
      businessId: state.businessId,
      customerId: state.customerId,
      updatedAt: input.receivedAt,
    })

    return result.responses
  }
}
