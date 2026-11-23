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

test('confirma texto autenticado e responde pela jornada em segundo plano', async (t) => {
  const events: Array<{ event: string; traceId: string; messageIndex?: number; step?: string }> = []
  t.mock.method(console, 'log', (message: string) => { events.push(JSON.parse(message)) })
  const body = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: 'phone-id' }, messages: [{
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
    assert.deepEqual(events.map(({ event }) => event), [
      'webhook_received', 'webhook_authenticated', 'webhook_acknowledged',
      'conversation_storage_not_configured', 'message_started', 'conversation_started',
      'conversation_saved', 'whatsapp_send_started', 'whatsapp_send_succeeded',
      'message_finished', 'webhook_finished',
    ])
    assert.equal(new Set(events.map(({ traceId }) => traceId)).size, 1)
    assert.match(events[0].traceId, /^[0-9a-f-]{36}$/)
    assert.equal(events.find(({ event }) => event === 'conversation_saved')?.step, 'offered_actions')
    assert.equal(events.find(({ event }) => event === 'whatsapp_send_succeeded')?.messageIndex, 1)
    assert.doesNotMatch(JSON.stringify(events), /customer-integration|wamid.integration|test-app-secret|booking:start/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('usa o catálogo e o remetente de cada número empresarial no mesmo webhook', async (t) => {
  const calls: Array<{ sender: string; text: string; rows: Array<{ title: string; description: string }> }> = []
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const payload = JSON.parse(String(init.body))
    calls.push({
      sender: new URL(url).pathname.split('/')[2],
      text: payload.text?.body ?? '',
      rows: payload.interactive?.action.sections?.flatMap((section: { rows: [] }) => section.rows) ?? [],
    })
    return new Response(null, { status: 200 })
  })
  const pending: Promise<unknown>[] = []
  const body = JSON.stringify({ entry: [{ changes: [
    { value: { metadata: { phone_number_id: 'desconhecido' }, messages: [
      { from: 'cliente-demo', id: 'preco-desconhecido', type: 'text', text: { body: 'Qual o preço?' } },
    ] } },
    ...['barbearia-teste', 'salao-teste'].map((phoneNumberId) => ({
      value: { metadata: { phone_number_id: phoneNumberId }, messages: [
        { from: 'cliente-demo', id: 'preco-demo', type: 'text', text: { body: 'Qual o preço?' } },
        { from: 'cliente-demo', id: 'catalogo-demo', type: 'interactive', interactive: { button_reply: { id: 'services:show' } } },
      ] },
    })),
    { value: { messages: [
      { from: 'cliente-demo', id: 'sem-metadados', type: 'text', text: { body: 'Qual o preço?' } },
    ] } },
  ] }] })
  const response = await app.request('/webhook', {
    method: 'POST', headers: { 'x-hub-signature-256': await signature(body) }, body,
  }, {
    ...bindings,
    WHATSAPP_BUSINESS_PROFILES: JSON.stringify({ 'barbearia-teste': 'barbershop', 'salao-teste': 'salon' }),
  }, {
    waitUntil(promise: Promise<unknown>) { pending.push(promise) },
    passThroughOnException() {},
    props: undefined,
  })
  assert.equal(await response.text(), 'EVENT_RECEIVED')
  await Promise.all(pending)
  assert.deepEqual(calls.map((call) => call.sender), ['barbearia-teste', 'barbearia-teste', 'salao-teste', 'salao-teste'])
  assert.match(calls[0].text, /Corte masculino: R\$ 45,00/)
  assert.doesNotMatch(calls[0].text, /Escova/)
  assert.deepEqual(calls[1].rows.map(({ title }) => title), ['Corte masculino', 'Barba', 'Corte + barba', 'Pezinho'])
  assert.match(calls[2].text, /Escova: R\$ 55,00/)
  assert.doesNotMatch(calls[2].text, /Barba/)
  assert.deepEqual(calls[3].rows.map(({ title, description }) => [title, description]), [
    ['Corte feminino', 'R$ 70,00'], ['Escova', 'R$ 55,00'], ['Hidratação', 'R$ 90,00'],
  ])
})
