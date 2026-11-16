import { Hono } from 'hono'

import type { Bindings } from './env.ts'
import { logOperationalEvent } from './logging/logger.ts'

import {
  extractIncomingMessages,
  type WhatsAppWebhookPayload,
} from './whatsapp/types.ts'

import {
  sendWhatsAppResponse,
} from './whatsapp/client.ts'
import { verifyWhatsAppSignature } from './whatsapp/signature.ts'
import { barbershopConfig } from './barbershop/config.ts'
import { createBookingJourneyEngine } from './conversation/booking-engine.ts'
import { ConversationOrchestrator } from './conversation/orchestrator.ts'
import type { ConversationRepository } from './persistence/conversation-repository.ts'
import { InMemoryConversationRepository } from './persistence/in-memory-conversation-repository.ts'
import { D1ConversationRepository } from './persistence/d1-conversation-repository.ts'

const inMemoryRepository = new InMemoryConversationRepository()

function createOrchestrator(repository: ConversationRepository) {
  return new ConversationOrchestrator(
    repository,
    createBookingJourneyEngine(repository, barbershopConfig),
  )
}

const app = new Hono<{
  Bindings: Bindings
}>()

app.get('/', (c) => {
  return c.json({
    name: 'atendente-whatsapp',
    status: 'running',
  })
})

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
  })
})

//
// META WEBHOOK VERIFICATION
//

app.get('/webhook', (c) => {
  const mode =
    c.req.query('hub.mode')

  const verifyToken =
    c.req.query('hub.verify_token')

  const challenge =
    c.req.query('hub.challenge')

  if (
    mode === 'subscribe' &&
    verifyToken === c.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    logOperationalEvent('webhook_verified', 'success')

    return c.text(challenge)
  }

  logOperationalEvent('webhook_verification_failed', 'rejected')

  return c.text('Forbidden', 403)
})

//
// RECEBIMENTO DE EVENTOS
//

app.post('/webhook', async (c) => {
  const rawBody = await c.req.arrayBuffer()
  const signature = c.req.header('x-hub-signature-256')
  const isAuthentic = await verifyWhatsAppSignature(
    rawBody,
    signature,
    c.env.WHATSAPP_APP_SECRET,
  )

  if (!isAuthentic) {
    logOperationalEvent('webhook_signature_rejected', 'rejected')
    return c.text('UNAUTHORIZED', 401)
  }

  let payload: WhatsAppWebhookPayload

  try {
    payload = JSON.parse(
      new TextDecoder().decode(rawBody),
    ) as WhatsAppWebhookPayload
  } catch {
    logOperationalEvent('webhook_invalid_json', 'rejected')
    return c.text('BAD_REQUEST', 400)
  }

  const messages = extractIncomingMessages(payload)

  if (messages.length === 0) {
    logOperationalEvent('webhook_ignored', 'ignored')
    return c.text('EVENT_RECEIVED')
  }

  c.executionCtx.waitUntil(
    (async () => {
      const repository = c.env.DB
        ? new D1ConversationRepository(c.env.DB)
        : inMemoryRepository
      const orchestrator = createOrchestrator(repository)

      if (!c.env.DB) {
        logOperationalEvent('conversation_storage_not_configured', 'failed')
      }

      for (const message of messages) {
        const responses = await orchestrator.handle({
          businessId: barbershopConfig.id,
          customerId: message.from,
          messageId: message.id,
          receivedAt: new Date().toISOString(),
          ...(message.type === 'text'
            ? { text: message.text }
            : { interactiveId: message.interactiveId }),
        })

        for (const response of responses) {
          if (response.type !== 'flow') {
            await sendWhatsAppResponse(c.env, message.from, response)
          }
        }
      }
    })().catch(() => {
      logOperationalEvent('message_processing_failed', 'failed')
    }),
  )

  return c.text('EVENT_RECEIVED')
})

export default app
