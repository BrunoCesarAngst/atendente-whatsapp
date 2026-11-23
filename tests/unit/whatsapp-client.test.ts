import assert from 'node:assert/strict'
import test from 'node:test'

import { sendWhatsAppResponse } from '../../src/whatsapp/client.ts'
import type { ConversationResponse } from '../../src/conversation/responses.ts'

const bindings = {
  WHATSAPP_VERIFY_TOKEN: 'verify-token',
  WHATSAPP_APP_SECRET: 'app-secret',
  WHATSAPP_ACCESS_TOKEN: 'access-token',
  WHATSAPP_PHONE_NUMBER_ID: 'phone-id',
  WHATSAPP_GRAPH_API_VERSION: 'v26.0',
}

test('registra somente códigos seguros quando a Cloud API rejeita um envio', async () => {
  const originalFetch = globalThis.fetch
  const originalLog = console.log
  const logs: string[] = []
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      code: 131030,
      error_subcode: 2494010,
      message: 'sensitive external response',
      error_user_title: 'customer-id',
    },
  }), { status: 403 })
  console.log = (message: string) => logs.push(message)

  try {
    await assert.rejects(
      sendWhatsAppResponse(bindings, 'customer-id', { type: 'text', text: 'mensagem de teste' }),
      /WhatsApp API error 403/,
    )
  } finally {
    globalThis.fetch = originalFetch
    console.log = originalLog
  }

  assert.equal(logs.length, 2)
  assert.deepEqual(JSON.parse(logs[0]), { event: 'whatsapp_send_started', outcome: 'started' })
  const { durationMs, ...failure } = JSON.parse(logs[1])
  assert.ok(durationMs >= 0)
  assert.deepEqual(failure, {
    event: 'whatsapp_send_failed', outcome: 'failed', httpStatus: 403,
    graphErrorCode: 131030, graphErrorSubcode: 2494010,
  })
  assert.doesNotMatch(logs.join(''), /sensitive|customer-id|mensagem de teste/)
})

test('usa endpoint local configurado para o envio durante o desenvolvimento', async () => {
  const originalFetch = globalThis.fetch
  const requests: string[] = []
  globalThis.fetch = async (input) => {
    requests.push(String(input))
    return new Response(null, { status: 200 })
  }

  try {
    await sendWhatsAppResponse({
      ...bindings,
      WHATSAPP_GRAPH_API_BASE_URL: 'http://127.0.0.1:8788/',
    }, 'customer-id', { type: 'text', text: 'mensagem de teste' })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.deepEqual(requests, [
    'http://127.0.0.1:8788/v26.0/phone-id/messages',
  ])
})

test('identifica homologação e desenvolvimento nos payloads sem marcar produção', async (t) => {
  const requests: string[] = []
  t.mock.method(globalThis, 'fetch', async (_input: RequestInfo, init?: RequestInit) => {
    requests.push(String(init?.body))
    return new Response(null, { status: 200 })
  })

  const replies = [
    { type: 'text', text: 'Horário confirmado' },
    { type: 'buttons', text: 'Como posso ajudar?', options: [{ id: 'start', label: 'Agendar' }] },
    { type: 'list', text: 'Escolha um serviço', buttonLabel: 'Ver serviços',
      options: [{ id: 'haircut', label: 'Corte' }] },
  ] satisfies Exclude<ConversationResponse, { type: 'flow' }>[]

  for (const reply of replies) {
    for (const APP_ENV of ['production', 'staging', 'development']) {
      await sendWhatsAppResponse({ ...bindings, APP_ENV }, 'customer-id', reply)
    }
  }

  for (const [index, reply] of replies.entries()) {
    const [production, staging, local] = requests.slice(index * 3, index * 3 + 3).map((body) => JSON.parse(body))
    if (reply.type === 'text') {
      assert.equal(production.text.body, reply.text)
      assert.equal(staging.text.body, `${reply.text}\n\n🧪 Homologação`)
      assert.equal(local.text.body, `${reply.text}\n\n🛠️ Desenvolvimento`)
    } else {
      assert.deepEqual(staging.interactive, { ...production.interactive, footer: { text: '🧪 Homologação' } })
      assert.deepEqual(local.interactive, { ...production.interactive, footer: { text: '🛠️ Desenvolvimento' } })
      assert.equal(production.interactive.footer, undefined)
    }
  }
})
