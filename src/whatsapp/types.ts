export type WhatsAppWebhookPayload = {
  object?: string

  entry?: Array<{
    id?: string

    changes?: Array<{
      field?: string

      value?: {
        messaging_product?: string

        metadata?: {
          display_phone_number?: string
          phone_number_id?: string
        }

        contacts?: Array<{
          profile?: {
            name?: string
          }

          wa_id?: string
        }>

        messages?: Array<{
          from?: string
          id?: string
          timestamp?: string
          type?: string

          text?: {
            body?: string
          }
        }>
      }
    }>
  }>
}

export type IncomingTextMessage = {
  from: string
  id: string
  text: string
}

export function extractIncomingTextMessages(
  payload: WhatsAppWebhookPayload,
): IncomingTextMessage[] {
  const result: IncomingTextMessage[] = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (
          message.type === 'text' &&
          message.from &&
          message.id &&
          message.text?.body
        ) {
          result.push({
            from: message.from,
            id: message.id,
            text: message.text.body,
          })
        }
      }
    }
  }

  return result
}