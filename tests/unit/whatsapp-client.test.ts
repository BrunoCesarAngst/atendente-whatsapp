import assert from 'node:assert/strict'
import test from 'node:test'

import { sendWhatsAppResponse } from '../../src/whatsapp/client.ts'

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

  assert.deepEqual(logs, [
    '{"event":"whatsapp_send_failed","outcome":"failed","httpStatus":403,"graphErrorCode":131030,"graphErrorSubcode":2494010}',
  ])
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
