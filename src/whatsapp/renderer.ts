import type { ConversationResponse } from '../conversation/responses.ts'

type WhatsAppTextPayload = {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'text'
  text: {
    preview_url: false
    body: string
  }
}

type WhatsAppInteractivePayload = {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'interactive'
  interactive: Record<string, unknown>
}

export type WhatsAppMessagePayload =
  | WhatsAppTextPayload
  | WhatsAppInteractivePayload

function assertOptionCount(
  options: Array<unknown>,
  maximum: number,
  responseType: string,
) {
  if (options.length === 0 || options.length > maximum) {
    throw new Error(
      `${responseType} response requires between 1 and ${maximum} options`,
    )
  }
}

export function renderWhatsAppResponse(
  to: string,
  response: Exclude<ConversationResponse, { type: 'flow' }>,
  environment?: string,
): WhatsAppMessagePayload {
  const environmentLabel = environment === 'staging' ? '🧪 Homologação'
    : environment === 'development' ? '🛠️ Desenvolvimento' : undefined

  if (response.type === 'text') {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: environmentLabel ? `${response.text}\n\n${environmentLabel}` : response.text,
      },
    }
  }

  const footer = environmentLabel ? { footer: { text: environmentLabel } } : {}

  if (response.type === 'buttons') {
    assertOptionCount(response.options, 3, 'buttons')

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: response.text },
        ...footer,
        action: {
          buttons: response.options.map((option) => ({
            type: 'reply',
            reply: { id: option.id, title: option.label },
          })),
        },
      },
    }
  }

  assertOptionCount(response.options, 10, 'list')

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: response.text },
      ...footer,
      action: {
        button: response.buttonLabel,
        sections: [{
          title: 'Opções',
          rows: response.options.map((option) => ({
            id: option.id,
            title: option.label,
            ...(option.description ? { description: option.description } : {}),
          })),
        }],
      },
    },
  }
}
