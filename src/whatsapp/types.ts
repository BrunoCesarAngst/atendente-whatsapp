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

          interactive?: {
            type?: string
            button_reply?: {
              id?: string
              title?: string
            }
            list_reply?: {
              id?: string
              title?: string
              description?: string
            }
          }
        }>
      }
    }>
  }>
}

export type IncomingTextMessage = {
  type: 'text'
  from: string
  id: string
  text: string
  phoneNumberId?: string
}

export type IncomingInteractiveReply = {
  type: 'interactive'
  from: string
  id: string
  interactiveId: string
}

export type IncomingWhatsAppMessage =
  | IncomingTextMessage
  | IncomingInteractiveReply

export function extractIncomingMessages(
  payload: WhatsAppWebhookPayload,
): IncomingWhatsAppMessage[] {
  const result: IncomingWhatsAppMessage[] = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (!message.from || !message.id) {
          continue
        }

        if (message.type === 'text' && message.text?.body) {
          const phoneNumberId = change.value?.metadata?.phone_number_id
          result.push({
            type: 'text',
            from: message.from,
            id: message.id,
            text: message.text.body,
            ...(phoneNumberId === undefined ? {} : { phoneNumberId }),
          })
          continue
        }

        const interactiveId =
          message.interactive?.button_reply?.id ??
          message.interactive?.list_reply?.id

        if (message.type === 'interactive' && interactiveId) {
          result.push({
            type: 'interactive',
            from: message.from,
            id: message.id,
            interactiveId,
          })
        }
      }
    }
  }

  return result
}

export function extractIncomingTextMessages(
  payload: WhatsAppWebhookPayload,
): Array<Pick<IncomingTextMessage, 'from' | 'id' | 'text'>> {
  return extractIncomingMessages(payload)
    .filter((message): message is IncomingTextMessage => message.type === 'text')
    .map(({ from, id, text }) => ({ from, id, text }))
}
