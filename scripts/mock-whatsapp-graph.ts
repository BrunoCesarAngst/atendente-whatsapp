import { createServer } from 'node:http'

type MockMessage = {
  type: string | null
  interactiveType: string | null
  actionIds: string[]
}

const host = '127.0.0.1'
const port = 8788
let messages: MockMessage[] = []

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : null
}

function summarizeMessage(value: unknown): MockMessage {
  const payload = asRecord(value)
  const interactive = asRecord(payload?.interactive)
  const action = asRecord(interactive?.action)
  const buttons = Array.isArray(action?.buttons) ? action.buttons : []
  const sections = Array.isArray(action?.sections) ? action.sections : []
  const rows = sections.flatMap((section) => {
    const sectionRecord = asRecord(section)
    return Array.isArray(sectionRecord?.rows) ? sectionRecord.rows : []
  })
  const options = [...buttons, ...rows]

  return {
    type: typeof payload?.type === 'string' ? payload.type : null,
    interactiveType: typeof interactive?.type === 'string' ? interactive.type : null,
    actionIds: options.flatMap((option) => {
      const optionRecord = asRecord(option)
      const reply = asRecord(optionRecord?.reply)
      const id = reply?.id ?? optionRecord?.id
      return typeof id === 'string' ? [id] : []
    }),
  }
}

async function readJson(request: AsyncIterable<Uint8Array>) {
  let body = ''
  for await (const chunk of request) {
    body += new TextDecoder().decode(chunk)
  }
  return JSON.parse(body) as unknown
}

function sendJson(response: { writeHead: (status: number, headers: Record<string, string>) => void; end: (body: string) => void }, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${host}:${port}`)

  if (request.method === 'POST' && url.pathname === '/__mock__/reset') {
    messages = []
    return sendJson(response, 200, { reset: true })
  }

  if (request.method === 'GET' && url.pathname === '/__mock__/messages') {
    return sendJson(response, 200, { count: messages.length, messages })
  }

  if (request.method === 'POST' && /^\/v[^/]+\/[^/]+\/messages$/.test(url.pathname)) {
    try {
      messages.push(summarizeMessage(await readJson(request)))
    } catch {
      return sendJson(response, 400, { error: { code: 100 } })
    }

    console.log(JSON.stringify({ event: 'mock_whatsapp_message_received', count: messages.length }))
    return sendJson(response, 200, { messaging_product: 'whatsapp', messages: [{ id: `mock-${messages.length}` }] })
  }

  return sendJson(response, 404, { error: { code: 404 } })
}).listen(port, host, () => {
  console.log(`Mock WhatsApp Graph API ready on http://${host}:${port}`)
})
