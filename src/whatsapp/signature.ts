const signaturePrefix = 'sha256='
const digestHexLength = 64

function decodeHex(value: string): Uint8Array | null {
  if (
    value.length !== digestHexLength ||
    !/^[0-9a-f]{64}$/i.test(value)
  ) {
    return null
  }

  const bytes = new Uint8Array(value.length / 2)

  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16)
  }

  return bytes
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false
  }

  let difference = 0

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index]
  }

  return difference === 0
}

export async function verifyWhatsAppSignature(
  rawBody: ArrayBuffer,
  signatureHeader: string | undefined,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader?.startsWith(signaturePrefix)) {
    return false
  }

  const received = decodeHex(signatureHeader.slice(signaturePrefix.length))

  if (!received || !appSecret) {
    return false
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, rawBody),
  )

  return equalBytes(expected, received)
}
