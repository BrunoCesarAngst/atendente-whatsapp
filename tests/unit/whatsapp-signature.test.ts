import assert from 'node:assert/strict'
import test from 'node:test'

import { verifyWhatsAppSignature } from '../../src/whatsapp/signature.ts'

const secret = 'test-app-secret'
const encoder = new TextEncoder()

async function signedHeader(body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(body)),
  )
  const hex = [...digest]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return `sha256=${hex}`
}

test('aceita assinatura que corresponde aos bytes originais', async () => {
  const body = '{"entry":[]}'

  assert.equal(
    await verifyWhatsAppSignature(
      encoder.encode(body).buffer as ArrayBuffer,
      await signedHeader(body),
      secret,
    ),
    true,
  )
})

test('rejeita assinatura ausente, malformada ou de outro corpo', async () => {
  const body = '{"entry":[]}'

  assert.equal(
    await verifyWhatsAppSignature(encoder.encode(body).buffer as ArrayBuffer, undefined, secret),
    false,
  )
  assert.equal(
    await verifyWhatsAppSignature(encoder.encode(body).buffer as ArrayBuffer, 'sha256=not-hex', secret),
    false,
  )
  assert.equal(
    await verifyWhatsAppSignature(
      encoder.encode(body).buffer as ArrayBuffer,
      await signedHeader('{"entry":[1]}'),
      secret,
    ),
    false,
  )
})
