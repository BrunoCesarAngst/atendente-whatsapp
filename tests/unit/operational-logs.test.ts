import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('o terminal mostra apenas eventos e detalhes operacionais permitidos', () => {
  const input = JSON.stringify({
    event: { request: { url: 'https://example.test/webhook?token=conteudo-ficticio' } },
    logs: [
      { message: ['conteudo-ficticio'] },
      { message: [JSON.stringify({ event: 'evento-externo', outcome: 'success' })] },
      { timestamp: 0, message: [JSON.stringify({
        event: 'whatsapp_send_failed', outcome: 'failed', httpStatus: 400,
        graphErrorCode: 131030, traceId: '12345678-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        messageIndex: 1, step: 'conteudo-ficticio', durationMs: 'conteudo-ficticio',
      })] },
    ],
  })
  const result = spawnSync(process.execPath, [
    '--experimental-strip-types', 'scripts/format-operational-logs.ts',
  ], { input: input + '\n', encoding: 'utf8' })
  assert.equal(result.status, 0)
  assert.match(result.stdout, /ERRO \| Falha no envio à Meta/)
  assert.match(result.stdout, /rastro=12345678 posição=1 HTTP=400 Meta=131030/)
  assert.doesNotMatch(result.stdout, /conteudo-ficticio|evento-externo|example.test/)
  assert.equal(result.stdout.trim().split('\n').length, 1)
})
