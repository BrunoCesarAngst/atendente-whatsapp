import type { Bindings } from '../env.ts'
import { logOperationalEvent, type OperationalLogger } from '../logging/logger.ts'
import type { ConversationResponse } from '../conversation/responses.ts'
import { renderWhatsAppResponse } from './renderer.ts'

type GraphErrorResponse = {
  error?: {
    code?: unknown
    error_subcode?: unknown
  }
}

function getGraphApiBaseUrl(env: Bindings) {
  return (env.WHATSAPP_GRAPH_API_BASE_URL ?? 'https://graph.facebook.com')
    .replace(/\/+$/, '')
}

async function getSafeGraphErrorDetails(response: Response) {
  const payload = await response.json().catch(() => undefined) as GraphErrorResponse | undefined
  const error = payload?.error

  return {
    ...(typeof error?.code === 'number' ? { graphErrorCode: error.code } : {}),
    ...(typeof error?.error_subcode === 'number'
      ? { graphErrorSubcode: error.error_subcode }
      : {}),
  }
}

export async function sendWhatsAppText(
  env: Bindings,
  to: string,
  body: string,
) {
  return sendWhatsAppResponse(env, to, { type: 'text', text: body })
}

export async function sendWhatsAppResponse(
  env: Bindings,
  to: string,
  messageResponse: Exclude<ConversationResponse, { type: 'flow' }>,
  phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID,
  log: OperationalLogger = logOperationalEvent,
) {
  const url =
    `${getGraphApiBaseUrl(env)}/` +
    `${env.WHATSAPP_GRAPH_API_VERSION}/` +
    `${encodeURIComponent(phoneNumberId)}/messages`

  log('whatsapp_send_started', 'started')
  const startedAt = Date.now()
  const response = await fetch(url, {
    method: 'POST',

    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },

    body: JSON.stringify(renderWhatsAppResponse(to, messageResponse, env.APP_ENV)),
  })

  if (!response.ok) {
    log('whatsapp_send_failed', 'failed', {
      durationMs: Date.now() - startedAt,
      httpStatus: response.status,
      ...await getSafeGraphErrorDetails(response),
    })
    throw new Error(`WhatsApp API error ${response.status}`)
  }

  log('whatsapp_send_succeeded', 'success', { httpStatus: response.status, durationMs: Date.now() - startedAt })
}
