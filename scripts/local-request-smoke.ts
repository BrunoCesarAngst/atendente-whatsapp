import { createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'

type MockMessage = {
  type: string | null
  actionIds: string[]
}

const workerUrl = process.env.LOCAL_WORKER_URL ?? 'http://127.0.0.1:8787'
const mockUrl = process.env.LOCAL_GRAPH_MOCK_URL ?? 'http://127.0.0.1:8788'
const profile = process.env.LOCAL_REQUEST_PROFILE ?? 'pool'

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
    entry: [{ changes: [{ value: { metadata: { phone_number_id: await readLocalVariable('WHATSAPP_PHONE_NUMBER_ID') }, messages: [{
      from: `local-${profile}-customer`,
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
  if (!['pool', 'gardening'].includes(profile)) {
    throw new Error('LOCAL_REQUEST_PROFILE must be pool or gardening')
  }

  const secret = await readLocalVariable('WHATSAPP_APP_SECRET')
  const graphBaseUrl = await readLocalVariable('WHATSAPP_GRAPH_API_BASE_URL')
  if (graphBaseUrl.replace(/\/$/, '') !== mockUrl.replace(/\/$/, '')) {
    throw new Error('WHATSAPP_GRAPH_API_BASE_URL must point to LOCAL_GRAPH_MOCK_URL')
  }
  await fetch(`${mockUrl}/__mock__/reset`, { method: 'POST' })

  await sendIncoming(secret, `${profile}-1`, { type: 'text', text: { body: 'olá' } })
  let messages = await waitForMessages(1)
  await sendIncoming(secret, `${profile}-2`, {
    type: 'interactive', interactive: { button_reply: { id: actionId(messages, 'request:start') } },
  })
  messages = await waitForMessages(2)

  const serviceId = profile === 'pool' ? 'service:pool-cleaning' : 'service:lawn-mowing'
  await sendIncoming(secret, `${profile}-3`, {
    type: 'interactive', interactive: { list_reply: { id: serviceId } },
  })
  messages = await waitForMessages(3)

  if (profile === 'pool') {
    await sendIncoming(secret, `${profile}-4`, {
      type: 'interactive', interactive: { button_reply: { id: actionId(messages, 'field:frequency:') } },
    })
    messages = await waitForMessages(4)
    await sendIncoming(secret, `${profile}-5`, { type: 'text', text: { body: 'Centro' } })
  } else {
    await sendIncoming(secret, `${profile}-4`, { type: 'text', text: { body: 'Centro' } })
    messages = await waitForMessages(4)
    await sendIncoming(secret, `${profile}-5`, {
      type: 'interactive', interactive: { button_reply: { id: actionId(messages, 'field:area_size:') } },
    })
  }
  messages = await waitForMessages(5)

  await sendIncoming(secret, `${profile}-6`, {
    type: 'interactive', interactive: { button_reply: { id: actionId(messages, 'field:preferred_period:') } },
  })
  messages = await waitForMessages(6)
  if (messages.at(-1)?.type !== 'text') {
    throw new Error('Request confirmation did not produce a text response')
  }

  await sendIncoming(secret, `${profile}-7`, { type: 'text', text: { body: 'obrigado' } })
  await new Promise((resolve) => setTimeout(resolve, 150))
  if ((await getMessages()).length !== 6) {
    throw new Error('Human-mode conversation generated another response')
  }

  console.log(`Local ${profile} request smoke test passed: triage and human handoff verified.`)
}

await main()
