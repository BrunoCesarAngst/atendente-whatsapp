export type ActionOption = {
  id: string
  label: string
  description?: string
}

export type TextResponse = {
  type: 'text'
  text: string
}

export type ButtonsResponse = {
  type: 'buttons'
  text: string
  options: ActionOption[]
}

export type ListResponse = {
  type: 'list'
  text: string
  buttonLabel: string
  options: ActionOption[]
}

export type FlowResponse = {
  type: 'flow'
  flowId: string
  token: string
  data?: Record<string, string>
}

export type ConversationResponse =
  | TextResponse
  | ButtonsResponse
  | ListResponse
  | FlowResponse
