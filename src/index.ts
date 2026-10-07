import { Hono } from 'hono'

import type { Bindings } from './env'

import {
  extractIncomingTextMessages,
  type WhatsAppWebhookPayload,
} from './whatsapp/types'

import {
  sendWhatsAppText,
} from './whatsapp/client'

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
    console.log('Webhook verificado pela Meta')

    return c.text(challenge)
  }

  console.warn('Falha na verificação do webhook')

  return c.text('Forbidden', 403)
})

//
// RECEBIMENTO DE EVENTOS
//

app.post('/webhook', async (c) => {
  let payload: WhatsAppWebhookPayload

  try {
    payload =
      await c.req.json<WhatsAppWebhookPayload>()
  } catch {
    return c.text('BAD_REQUEST', 400)
  }

  console.log(
    'Webhook recebido:',
    JSON.stringify(payload),
  )

  const messages =
    extractIncomingTextMessages(payload)

  if (messages.length === 0) {
    return c.text('EVENT_RECEIVED')
  }

  c.executionCtx.waitUntil(
    (async () => {
      for (const message of messages) {
        console.log('Mensagem recebida:', {
          from: message.from,
          messageId: message.id,
          text: message.text,
        })

        await sendWhatsAppText(
          c.env,
          message.from,
          `Você disse: "${message.text}"

✅ Esta mensagem entrou no nosso Hono Worker e voltou pelo WhatsApp.`,
        )
      }
    })().catch((error) => {
      console.error(
        'Erro processando mensagem:',
        error,
      )
    }),
  )

  return c.text('EVENT_RECEIVED')
})

export default app