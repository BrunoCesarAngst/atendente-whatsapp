import assert from 'node:assert/strict'
import test from 'node:test'

import app from '../../src/index.ts'

const secret = 'test-app-secret'
const encoder = new TextEncoder()

const bindings = {
  WHATSAPP_VERIFY_TOKEN: 'verify-token',
  WHATSAPP_APP_SECRET: secret,
  WHATSAPP_ACCESS_TOKEN: 'access-token',
  WHATSAPP_PHONE_NUMBER_ID: 'phone-id',
  WHATSAPP_GRAPH_API_VERSION: 'v25.0',
  BUSINESS_PROFILE: 'pool',
}

async function signature(body: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)))
  return `sha256=${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function executionContext(pending: Promise<unknown>[]) {
  return {
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise)
    },
    passThroughOnException() {},
    props: undefined,
  }
}

async function postMessage(
  messageId: string,
  message: Record<string, unknown>,
  pending: Promise<unknown>[],
) {
  const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{
    from: 'pool-integration-customer', id: messageId, ...message,
  }] } }] }] })
  const response = await app.request('/webhook', {
    method: 'POST',
    headers: { 'x-hub-signature-256': await signature(body) },
    body,
  }, bindings, executionContext(pending))
  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'EVENT_RECEIVED')
  await Promise.all(pending.splice(0))
}

test('o webhook de piscina registra triagem e não responde após modo humano', async () => {
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  const pending: Promise<unknown>[] = []
  globalThis.fetch = async (_input, init) => {
    calls.push(String(init?.body))
    return new Response(null, { status: 200 })
  }

  try {
    await postMessage('pool-webhook-1', { type: 'text', text: { body: 'olá' } }, pending)
    await postMessage('pool-webhook-2', { type: 'interactive', interactive: { button_reply: { id: 'request:start' } } }, pending)
    await postMessage('pool-webhook-3', { type: 'interactive', interactive: { list_reply: { id: 'service:pool-cleaning' } } }, pending)
    await postMessage('pool-webhook-4', { type: 'interactive', interactive: { button_reply: { id: 'field:frequency:one-off' } } }, pending)
    await postMessage('pool-webhook-5', { type: 'text', text: { body: 'Centro' } }, pending)
    await postMessage('pool-webhook-6', { type: 'interactive', interactive: { button_reply: { id: 'field:preferred_period:this-week' } } }, pending)

    assert.equal(calls.length, 6)
    assert.match(calls.at(-1) ?? '', /pedido foi registrado/i)

    await postMessage('pool-webhook-7', { type: 'text', text: { body: 'obrigado' } }, pending)
    assert.equal(calls.length, 6)
  } finally {
    globalThis.fetch = originalFetch
  }
})
