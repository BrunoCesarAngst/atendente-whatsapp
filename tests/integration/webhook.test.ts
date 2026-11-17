import assert from 'node:assert/strict'
import test from 'node:test'

import app from '../../src/index.ts'

const secret = 'test-app-secret'
const encoder = new TextEncoder()

async function signature(body: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)))
  return `sha256=${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

const bindings = {
  WHATSAPP_VERIFY_TOKEN: 'verify-token',
  WHATSAPP_APP_SECRET: secret,
  WHATSAPP_ACCESS_TOKEN: 'access-token',
  WHATSAPP_PHONE_NUMBER_ID: 'phone-id',
  WHATSAPP_GRAPH_API_VERSION: 'v25.0',
}

test('expõe política de privacidade pública', async () => {
  const response = await app.request('/privacy', { method: 'GET' }, bindings)

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') ?? '', /text\/html/)
  assert.match(await response.text(), /Política de Privacidade/)
})

test('rejeita evento sem assinatura antes de interpretar JSON', async () => {
  const response = await app.request('/webhook', { method: 'POST', body: 'not-json' }, bindings)

  assert.equal(response.status, 401)
  assert.equal(await response.text(), 'UNAUTHORIZED')
})

test('confirma evento autenticado sem mensagem de texto', async () => {
  const body = JSON.stringify({ entry: [] })
  const response = await app.request('/webhook', {
    method: 'POST',
    headers: { 'x-hub-signature-256': await signature(body) },
    body,
  }, bindings)

  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'EVENT_RECEIVED')
})

test('confirma texto autenticado e responde pela jornada em segundo plano', async () => {
  const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{
    type: 'text', from: 'customer-integration', id: 'wamid.integration', text: { body: 'oi' },
  }] } }] }] })
  const originalFetch = globalThis.fetch
  const calls: Array<{ body?: string }> = []
  globalThis.fetch = async (_input, init) => {
    calls.push({ body: String(init?.body) })
    return new Response(null, { status: 200 })
  }
  const pending: Promise<unknown>[] = []
  const executionContext = {
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise)
    },
    passThroughOnException() {},
    props: undefined,
  }

  try {
    const response = await app.request('/webhook', {
      method: 'POST', headers: { 'x-hub-signature-256': await signature(body) }, body,
    }, bindings, executionContext)

    assert.equal(await response.text(), 'EVENT_RECEIVED')
    await Promise.all(pending)
    assert.equal(calls.length, 1)
    assert.match(calls[0]?.body ?? '', /booking:start/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
