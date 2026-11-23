import { Hono } from 'hono'

import type { Bindings } from './env.ts'
import { createRequestLogger, logOperationalEvent, type LogDetails } from './logging/logger.ts'

import {
  extractIncomingMessages,
  type WhatsAppWebhookPayload,
} from './whatsapp/types.ts'

import {
  sendWhatsAppResponse,
} from './whatsapp/client.ts'
import { verifyWhatsAppSignature } from './whatsapp/signature.ts'
import { getBusinessOwners, getBusinessRoutes } from './businesses/profiles.ts'
import { createJourneyEngine } from './conversation/journey-engine.ts'
import { ConversationOrchestrator } from './conversation/orchestrator.ts'
import { InMemoryConversationRepository } from './persistence/in-memory-conversation-repository.ts'
import { D1ConversationRepository } from './persistence/d1-conversation-repository.ts'
import { handleBookingImpactCommand } from './impact/booking-impact.ts'

const inMemoryRepository = new InMemoryConversationRepository()

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

app.get('/privacy', (c) => {
  return c.html(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Política de Privacidade — AtendenteG</title>
  </head>
  <body>
    <main>
      <h1>Política de Privacidade</h1>
      <p>Última atualização: 16 de novembro de 2026.</p>

      <h2>Finalidade</h2>
      <p>O AtendenteG é um atendente de serviços integrado ao WhatsApp. Ele usa as informações recebidas na conversa exclusivamente para responder solicitações, registrar agendamentos ou pedidos e encaminhá-los ao responsável pelo estabelecimento.</p>

      <h2>Dados tratados</h2>
      <p>Podem ser tratados o número de WhatsApp, nome de perfil disponibilizado pela plataforma, mensagens enviadas pelo cliente e dados necessários ao serviço solicitado, como horário, local ou detalhes do pedido.</p>

      <h2>Uso e compartilhamento</h2>
      <p>Os dados não são vendidos. Eles são usados somente para a operação do atendimento e podem ser compartilhados com a Meta/WhatsApp e com o estabelecimento responsável pelo serviço, quando isso for necessário para atender a solicitação.</p>

      <h2>Armazenamento e exclusão</h2>
      <p>Os dados são mantidos apenas pelo tempo necessário para o atendimento, a organização do serviço e obrigações aplicáveis. Para solicitar acesso, correção ou exclusão, entre em contato pelo mesmo canal de WhatsApp do estabelecimento que prestou o atendimento.</p>

      <h2>Segurança</h2>
      <p>O serviço utiliza conexões protegidas e controles de acesso apropriados. Nenhum sistema é totalmente livre de riscos, mas adotamos medidas razoáveis para proteger os dados tratados.</p>

      <h2>Alterações</h2>
      <p>Esta política poderá ser atualizada para refletir mudanças no serviço ou em requisitos legais. A versão vigente ficará disponível neste endereço.</p>
    </main>
  </body>
</html>`)
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
  const startedAt = Date.now()
  const traceId = crypto.randomUUID()
  const log = createRequestLogger(traceId)
  log('webhook_received', 'started')
  const rawBody = await c.req.arrayBuffer()
  const signature = c.req.header('x-hub-signature-256')
  const isAuthentic = await verifyWhatsAppSignature(
    rawBody,
    signature,
    c.env.WHATSAPP_APP_SECRET,
  )

  if (!isAuthentic) {
    log('webhook_signature_rejected', 'rejected', { httpStatus: 401 })
    return c.text('UNAUTHORIZED', 401)
  }

  log('webhook_authenticated', 'success')
  let messages: ReturnType<typeof extractIncomingMessages>

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(rawBody),
    ) as WhatsAppWebhookPayload
    messages = extractIncomingMessages(payload)
  } catch {
    log('webhook_invalid_json', 'rejected', { httpStatus: 400 })
    return c.text('BAD_REQUEST', 400)
  }

  if (messages.length === 0) {
    log('webhook_ignored', 'ignored', { httpStatus: 200, messageCount: 0 })
    return c.text('EVENT_RECEIVED')
  }

  log('webhook_acknowledged', 'success', { httpStatus: 200, messageCount: messages.length })
  let phase: LogDetails['phase'] = 'configuration'
  let messageIndex: number | undefined
  c.executionCtx.waitUntil(
    (async () => {
      const d1Repository = c.env.DB
        ? new D1ConversationRepository(c.env.DB)
        : null
      const repository = d1Repository ?? inMemoryRepository
      const routes = getBusinessRoutes(
        c.env.WHATSAPP_PHONE_NUMBER_ID, c.env.BUSINESS_PROFILE, c.env.WHATSAPP_BUSINESS_PROFILES,
      )
      const owners = getBusinessOwners(
        c.env.WHATSAPP_PHONE_NUMBER_ID, c.env.WHATSAPP_OWNER_ID, c.env.WHATSAPP_OWNER_IDS,
      )

      if (!c.env.DB) {
        log('conversation_storage_not_configured', 'failed')
      }

      for (const [index, message] of messages.entries()) {
        messageIndex = index + 1
        const messageLog = createRequestLogger(traceId, messageIndex)
        phase = 'conversation'
        messageLog('message_started', 'started', { messageType: message.type })
        const phoneId = message.phoneNumberId
        const business = phoneId ? routes.get(phoneId) : undefined
        if (!business || !phoneId) {
          messageLog('message_route_ignored', 'ignored')
          continue
        }
        const orchestrator = new ConversationOrchestrator(repository, createJourneyEngine(repository, business))
        const receivedAt = new Date().toISOString()
        const ownerResponses = d1Repository && business.mode === 'appointment' &&
          message.type === 'text' && message.from === owners?.get(phoneId)
          ? await handleBookingImpactCommand(d1Repository, {
              businessId: business.id, ownerId: message.from, messageId: message.id,
              receivedAt, text: message.text,
            }, messageLog)
          : null
        const responses = ownerResponses ?? await orchestrator.handle({
          businessId: business.id,
          customerId: message.from,
          messageId: message.id,
          receivedAt,
          ...(message.type === 'text'
            ? { text: message.text }
            : { interactiveId: message.interactiveId }),
        }, messageLog)

        phase = 'outbound'
        for (const response of responses) {
          if (response.type !== 'flow') {
            await sendWhatsAppResponse(c.env, message.from, response, phoneId, messageLog)
          }
        }
        messageLog('message_finished', 'success', { responseCount: responses.length })
      }
      log('webhook_finished', 'success', { durationMs: Date.now() - startedAt })
    })().catch(() => {
      createRequestLogger(traceId, messageIndex)('message_processing_failed', 'failed', { phase })
      log('webhook_finished', 'failed', { durationMs: Date.now() - startedAt })
    }),
  )

  return c.text('EVENT_RECEIVED')
})

export default app
