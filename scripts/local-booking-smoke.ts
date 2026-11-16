import { createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'

type MockMessage = {
  type: string | null
  interactiveType: string | null
  actionIds: string[]
}

const workerUrl = process.env.LOCAL_WORKER_URL ?? 'http://127.0.0.1:8787'
const mockUrl = process.env.LOCAL_GRAPH_MOCK_URL ?? 'http://127.0.0.1:8788'

function assertLocalUrl(value: string, description: string) {
  const url = new URL(value)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error(`${description} must use a local HTTP address`)
  }
}

async function readLocalVariable(name: string) {
  const source = await readFile('.dev.vars', 'utf8')
  const line = source.split(/\r?\n/).find((candidate) => candidate.startsWith(`${name}=`))
  const value = line?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '')
  if (!value) {
    throw new Error(`${name} is required in .dev.vars`)
  }
  return value
}

async function getMessages(): Promise<MockMessage[]> {
  const response = await fetch(`${mockUrl}/__mock__/messages`)
  const body = await response.json() as { messages?: MockMessage[] }
  if (!response.ok || !Array.isArray(body.messages)) {
    throw new Error('Local Graph mock is unavailable')
  }
  return body.messages
}

async function waitForMessages(expectedCount: number) {
  const deadline = Date.now() + 3_000
  while (Date.now() < deadline) {
    const messages = await getMessages()
    if (messages.length === expectedCount) {
      return messages
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`Timed out waiting for ${expectedCount} simulated response(s)`)
}

function actionId(messages: MockMessage[], prefix: string) {
  const id = messages.at(-1)?.actionIds.find((candidate) => candidate.startsWith(prefix))
  if (!id) {
    throw new Error(`Mock did not receive an action starting with ${prefix}`)
  }
  return id
}

async function sendIncoming(secret: string, messageId: string, message: Record<string, unknown>) {
  const body = JSON.stringify({
    entry: [{ changes: [{ value: { messages: [{
      from: 'local-smoke-customer',
      id: messageId,
      ...message,
    }] } }] }],
  })
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
  const response = await fetch(`${workerUrl}/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature },
    body,
  })

  if (response.status !== 200 || await response.text() !== 'EVENT_RECEIVED') {
    throw new Error(`Worker rejected local webhook ${messageId}`)
  }
}

async function main() {
  assertLocalUrl(workerUrl, 'LOCAL_WORKER_URL')
  assertLocalUrl(mockUrl, 'LOCAL_GRAPH_MOCK_URL')
  const secret = await readLocalVariable('WHATSAPP_APP_SECRET')
  const graphBaseUrl = await readLocalVariable('WHATSAPP_GRAPH_API_BASE_URL')

  if (graphBaseUrl.replace(/\/$/, '') !== mockUrl.replace(/\/$/, '')) {
    throw new Error('WHATSAPP_GRAPH_API_BASE_URL must point to LOCAL_GRAPH_MOCK_URL')
  }

  const reset = await fetch(`${mockUrl}/__mock__/reset`, { method: 'POST' })
  if (!reset.ok) {
    throw new Error('Could not reset the local Graph mock')
  }

  await sendIncoming(secret, 'local-smoke-1', { type: 'text', text: { body: 'olá' } })
  let messages = await waitForMessages(1)
  const startBooking = actionId(messages, 'booking:start')

  await sendIncoming(secret, 'local-smoke-2', {
    type: 'interactive', interactive: { button_reply: { id: startBooking } },
  })
  messages = await waitForMessages(2)

  await sendIncoming(secret, 'local-smoke-3', {
    type: 'interactive', interactive: { list_reply: { id: actionId(messages, 'service:') } },
  })
  messages = await waitForMessages(3)

  await sendIncoming(secret, 'local-smoke-4', {
    type: 'interactive', interactive: { button_reply: { id: actionId(messages, 'date:') } },
  })
  messages = await waitForMessages(4)

  await sendIncoming(secret, 'local-smoke-5', {
    type: 'interactive', interactive: { list_reply: { id: actionId(messages, 'slot:') } },
  })
  messages = await waitForMessages(5)

  const confirmation = actionId(messages, 'booking:confirm')
  await sendIncoming(secret, 'local-smoke-6', {
    type: 'interactive', interactive: { button_reply: { id: confirmation } },
  })
  messages = await waitForMessages(6)
  if (messages.at(-1)?.type !== 'text') {
    throw new Error('Booking confirmation did not produce a text response')
  }

  await sendIncoming(secret, 'local-smoke-6', {
    type: 'interactive', interactive: { button_reply: { id: confirmation } },
  })
  await new Promise((resolve) => setTimeout(resolve, 150))
  if ((await getMessages()).length !== 6) {
    throw new Error('Duplicate message generated another response')
  }

  console.log('Local booking smoke test passed: 1 reservation flow and duplicate suppression verified.')
}

await main()
