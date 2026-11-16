export type ConversationMode = 'automation' | 'human'

export type ConversationState = {
  businessId: string
  customerId: string
  currentJourney: string
  currentStep: string
  mode: ConversationMode
  context: Record<string, string>
  createdAt: string
  updatedAt: string
}

export function createConversationState(
  businessId: string,
  customerId: string,
  now: string,
): ConversationState {
  return {
    businessId,
    customerId,
    currentJourney: 'none',
    currentStep: 'start',
    mode: 'automation',
    context: {},
    createdAt: now,
    updatedAt: now,
  }
}
