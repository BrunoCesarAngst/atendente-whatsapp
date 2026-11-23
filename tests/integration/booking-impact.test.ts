import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import test from 'node:test'
import { URL } from 'node:url'
import app from '../../src/index.ts'
import { barbershopConfig } from '../../src/barbershop/config.ts'
import type { Bindings } from '../../src/env.ts'
import { D1ConversationRepository } from '../../src/persistence/d1-conversation-repository.ts'

const secret = 'chave-ficticia-para-teste'
const owner = 'responsavel-ficticio'
const phoneNumberId = 'numero-de-teste'

function createDatabase() {
  const sqlite = new DatabaseSync(':memory:')
  const migrations = new URL('../../migrations/', import.meta.url)
  for (const filename of readdirSync(migrations).sort()) {
    sqlite.exec(readFileSync(new URL(filename, migrations), 'utf8'))
  }
  function prepare(sql: string, values: SQLInputValue[] = []): D1PreparedStatement {
    const statement = sqlite.prepare(sql)
    const meta = {
      duration: 0, size_after: 0, rows_read: 0, rows_written: 0,
      last_row_id: 0, changed_db: false, changes: 0,
    }
    return {
      bind(...parameters: unknown[]) { return prepare(sql, parameters as SQLInputValue[]) },
      async first<T>(column?: string) {
        const row = statement.get(...values)
        return (column === undefined ? row ?? null : row?.[column] ?? null) as T | null
      },
      async all<T>() {
        return { success: true, meta, results: statement.all(...values) as T[] }
      },
      async run<T>() {
        const { changes } = statement.run(...values)
        return { success: true, meta: { ...meta, changes: Number(changes) }, results: [] as T[] }
      },
      raw() { throw new Error('Método fora do contrato exercitado pelo teste') },
    }
  }
  const binding = { prepare } as D1Database
  return { sqlite, binding }
}

test('mede reservas pelo webhook, mantém a calibração histórica e restringe o relatório ao responsável', async (t) => {
  const { sqlite, binding } = createDatabase()
  t.after(() => sqlite.close())

  const calls: Array<{
    to: string
    text?: { body: string }
    interactive?: {
      action: {
        buttons?: Array<{ reply: { id: string } }>
        sections?: Array<{ rows: Array<{ id: string }> }>
      }
    }
  }> = []
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)))
    return new Response(null, { status: 200 })
  })

  const bindings: Bindings = {
    DB: binding,
    WHATSAPP_APP_SECRET: secret,
    WHATSAPP_VERIFY_TOKEN: 'verificacao-ficticia',
    WHATSAPP_ACCESS_TOKEN: 'autorizacao-ficticia',
    WHATSAPP_GRAPH_API_VERSION: 'v25.0',
    WHATSAPP_PHONE_NUMBER_ID: phoneNumberId,
    WHATSAPP_OWNER_ID: owner,
  }

  const signingKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  let nextMessage = 0

  async function send(from: string, message: object, id = `evento-${++nextMessage}`, receiver = phoneNumberId) {
    const body = JSON.stringify({ entry: [{ changes: [{ value: {
      metadata: { phone_number_id: receiver },
      messages: [{ id, from, ...message }],
    } }] }] })
    const signature = Buffer.from(await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(body))).toString('hex')
    const pending: Promise<unknown>[] = []
    const response = await app.request('/webhook', {
      method: 'POST', headers: { 'x-hub-signature-256': `sha256=${signature}` }, body,
    }, bindings, {
      waitUntil(promise: Promise<unknown>) { pending.push(promise) },
      passThroughOnException() {},
      props: undefined,
    })
    assert.equal(await response.text(), 'EVENT_RECEIVED')
    await Promise.all(pending)
  }

  async function sendText(from: string, body: string, receiver = phoneNumberId) {
    await send(from, { type: 'text', text: { body } }, undefined, receiver)
    return calls.at(-1)?.text?.body ?? ''
  }

  function choose(from: string, action: string, id?: string) {
    return send(from, { type: 'interactive', interactive: { button_reply: { id: action } } }, id)
  }

  async function reachConfirmation(from: string, slotIndex: number) {
    await choose(from, 'booking:start')
    await choose(from, 'service:haircut')
    const date = calls.at(-1)?.interactive?.action.buttons?.[0]?.reply.id
    assert.ok(date)
    await choose(from, date)
    const slot = calls.at(-1)?.interactive?.action.sections?.[0]?.rows[slotIndex]?.id
    assert.ok(slot)
    await choose(from, slot)
  }

  sqlite.prepare(`INSERT INTO appointments
    (id, business_id, customer_id, service_id, professional_id, starts_at, price_in_reais, duration_minutes, status)
    VALUES ('historico', ?, 'cliente-ficticio', 'haircut', 'outro-profissional',
    '2026-11-25T09:00:00-03:00', 35, 30, 'confirmed')`).run(barbershopConfig.id)

  await reachConfirmation('cliente-sem-calibracao', 0)
  await choose('cliente-sem-calibracao', 'booking:confirm')
  const initialReport = await sendText(owner, '/valor')
  assert.match(initialReport, /Reservas gravadas automaticamente: 1/)
  assert.match(initialReport, /Sem estimativa de tempo/)

  assert.doesNotMatch(await sendText('cliente-sem-acesso', '/valor'), /Reservas gravadas/)
  assert.doesNotMatch(await sendText(owner, '/valor', 'outro-remetente-de-teste'), /Reservas gravadas/)
  assert.doesNotMatch(await sendText(owner, '/calibrar 8 8 8', 'outro-remetente-de-teste'), /Mediana/)
  assert.match(await sendText(owner, '/calibrar 120 180'), /Informe de 3 a 15/)
  assert.match(await sendText(owner, '/calibrar 240 60 120'), /Mediana: 2 min/)
  assert.match(await sendText(owner, '/custo-hora 60,00'), /R\$\s*60,00/)

  await reachConfirmation('cliente-com-calibracao', 0)
  await choose('cliente-com-calibracao', 'booking:confirm', 'confirmacao-ficticia')
  const sendsBeforeReplay = calls.length
  await choose('cliente-com-calibracao', 'booking:confirm', 'confirmacao-ficticia')
  assert.equal(calls.length, sendsBeforeReplay)
  await sendText(owner, '/calibrar 300 360 420')

  const report = await sendText(owner, '/valor')
  assert.match(report, /Reservas gravadas automaticamente: 2/)
  assert.match(report, /Com referência de tempo: 1 de 2/)
  assert.match(report, /Tempo poupado \(estimativa\): 2 min/)
  assert.match(report, /Equivalência do tempo: R\$\s*2,00/)
  assert.doesNotMatch(report, /cliente-com-calibracao|cliente-sem-calibracao/)
  assert.equal(calls.at(-1)?.to, owner)
})

test('agrega somente a janela solicitada e a empresa da reserva, mesmo com conflito de horário', async (t) => {
  const { sqlite, binding } = createDatabase()
  t.after(() => sqlite.close())
  const repository = new D1ConversationRepository(binding)
  const after = '2026-10-01T10:00:00.000Z'
  const through = '2026-10-31T10:00:00.000Z'
  const appointment = {
    businessId: 'empresa-a',
    customerId: 'cliente-ficticio',
    serviceId: 'haircut',
    professionalId: 'profissional-ficticio',
    startsAt: '2026-11-04T09:00:00-03:00',
    priceInReais: 35,
    durationMinutes: 30,
    automatedAt: through,
  }
  await repository.setBookingBaseline('empresa-a', 180, 3)
  await repository.setBookingHourlyCost('empresa-a', 6000)
  await repository.setBookingBaseline('empresa-b', 600, 5)

  const [confirmed, conflicted] = await Promise.all([
    repository.confirmAppointment(appointment),
    repository.confirmAppointment({ ...appointment, customerId: 'outro-cliente-ficticio' }),
  ])
  assert.ok(confirmed)
  assert.equal(conflicted, null)
  await repository.confirmAppointment({ ...appointment, businessId: 'empresa-b' })
  await repository.confirmAppointment({
    ...appointment, automatedAt: after, startsAt: '2026-11-04T10:00:00-03:00',
  })
  await repository.confirmAppointment({
    ...appointment, automatedAt: '2026-10-31T10:00:00.001Z', startsAt: '2026-11-04T11:00:00-03:00',
  })
  await repository.confirmAppointment({
    ...appointment, automatedAt: undefined, startsAt: '2026-11-04T12:00:00-03:00',
  })

  assert.deepEqual({ ...await repository.getBookingImpact('empresa-a', after, through) }, {
    automatedBookings: 1, estimatedBookings: 1, savedSeconds: 180, hourlyCostCents: 6000,
  })
  assert.deepEqual({ ...await repository.getBookingImpact('empresa-b', after, through) }, {
    automatedBookings: 1, estimatedBookings: 1, savedSeconds: 600, hourlyCostCents: null,
  })
})
