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
import { getBusinessProfile } from './businesses/profiles.ts'
import { createJourneyEngine } from './conversation/journey-engine.ts'
import { ConversationOrchestrator } from './conversation/orchestrator.ts'
import type { ConversationRepository } from './persistence/conversation-repository.ts'
import { InMemoryConversationRepository } from './persistence/in-memory-conversation-repository.ts'
import { D1ConversationRepository } from './persistence/d1-conversation-repository.ts'

const inMemoryRepository = new InMemoryConversationRepository()

function createOrchestrator(
  repository: ConversationRepository,
  profileName?: string,
) {
  const business = getBusinessProfile(profileName)
  return new ConversationOrchestrator(
    repository,
    createJourneyEngine(repository, business),
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
      const business = getBusinessProfile(c.env.BUSINESS_PROFILE)
      const orchestrator = createOrchestrator(repository, c.env.BUSINESS_PROFILE)

      if (!c.env.DB) {
        logOperationalEvent('conversation_storage_not_configured', 'failed')
      }

      for (const message of messages) {
        const responses = await orchestrator.handle({
          businessId: business.id,
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
