import { createInterface } from 'node:readline'
import { conversationSteps, operationalEvents, type SafeEvent } from '../src/logging/logger.ts'

const timestamp = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'medium',
})
const outcomes = { started: 'INÍCIO', success: 'OK', ignored: 'IGNORADO', failed: 'ERRO', rejected: 'RECUSADO' }
const phases = { configuration: 'configuração', conversation: 'conversa/D1', outbound: 'envio' }
const tracePattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

function parseJson(value: string): unknown {
  try { return JSON.parse(value) } catch { return undefined }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function label<T extends Record<string, string>>(values: T, key: unknown) {
  return typeof key === 'string' && Object.hasOwn(values, key) ? values[key as keyof T] : undefined
}

function metric(value: unknown, name: string) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? `${name}=${value}` : ''
}

for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  const envelope = record(parseJson(line))
  if (!Array.isArray(envelope?.logs)) continue
  for (const entry of envelope.logs) {
    const log = record(entry)
    if (!Array.isArray(log?.message)) continue
    for (const message of log.message) {
      if (typeof message !== 'string') continue
      const event = record(parseJson(message))
      if (!event || typeof event.event !== 'string' || !Object.hasOwn(operationalEvents, event.event)) continue
      const outcome = label(outcomes, event.outcome)
      if (!outcome) continue
      const time = typeof log.timestamp === 'number' ? log.timestamp : Date.now()
      const date = new Date(time)
      if (!Number.isFinite(date.valueOf())) continue
      const trace = typeof event.traceId === 'string' && tracePattern.test(event.traceId) ? event.traceId.slice(0, 8) : ''
      const phase = label(phases, event.phase)
      const type = event.messageType === 'text' ? 'texto' : event.messageType === 'interactive' ? 'interativa' : ''
      const details = [
        trace && `rastro=${trace}`,
        metric(event.messageIndex, 'posição'),
        type && `tipo=${type}`,
        label(conversationSteps, event.step) && `passo=${label(conversationSteps, event.step)}`,
        phase && `etapa=${phase}`,
        metric(event.messageCount, 'mensagens'),
        metric(event.responseCount, 'respostas'),
        metric(event.httpStatus, 'HTTP'),
        metric(event.graphErrorCode, 'Meta'),
        metric(event.graphErrorSubcode, 'subcódigo'),
        metric(event.durationMs, 'ms'),
      ].filter(Boolean).join(' ')
      console.log(`${timestamp.format(date)} | ${outcome} | ${operationalEvents[event.event as SafeEvent]}${details ? ' | ' + details : ''}`)
    }
  }
}
