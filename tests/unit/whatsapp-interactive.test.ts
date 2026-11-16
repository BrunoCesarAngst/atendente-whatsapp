import assert from 'node:assert/strict'
import test from 'node:test'

import { renderWhatsAppResponse } from '../../src/whatsapp/renderer.ts'
import { extractIncomingMessages } from '../../src/whatsapp/types.ts'

test('extrai IDs estáveis de button e list replies', () => {
  const messages = extractIncomingMessages({
    entry: [{ changes: [{ value: { messages: [
      {
        type: 'interactive', from: '5511999999999', id: 'wamid.button',
        interactive: { type: 'button_reply', button_reply: { id: 'booking:start', title: 'Agendar' } },
      },
      {
        type: 'interactive', from: '5511999999999', id: 'wamid.list',
        interactive: { type: 'list_reply', list_reply: { id: 'service:haircut', title: 'Corte' } },
      },
    ] } }] }],
  })

  assert.deepEqual(messages, [
    { type: 'interactive', from: '5511999999999', id: 'wamid.button', interactiveId: 'booking:start' },
    { type: 'interactive', from: '5511999999999', id: 'wamid.list', interactiveId: 'service:haircut' },
  ])
})

test('renderiza reply buttons no formato da Cloud API', () => {
  const payload = renderWhatsAppResponse('5511999999999', {
    type: 'buttons', text: 'Como posso ajudar?', options: [
      { id: 'booking:start', label: 'Agendar horário' },
      { id: 'handoff:start', label: 'Falar com alguém' },
    ],
  })

  assert.deepEqual(payload, {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: '5511999999999', type: 'interactive',
    interactive: {
      type: 'button', body: { text: 'Como posso ajudar?' },
      action: { buttons: [
        { type: 'reply', reply: { id: 'booking:start', title: 'Agendar horário' } },
        { type: 'reply', reply: { id: 'handoff:start', title: 'Falar com alguém' } },
      ] },
    },
  })
})

test('renderiza listas com IDs estáveis e limita botões', () => {
  const payload = renderWhatsAppResponse('5511999999999', {
    type: 'list', text: 'Escolha um serviço', buttonLabel: 'Ver serviços', options: [
      { id: 'service:haircut', label: 'Corte', description: 'R$ 45,00' },
    ],
  })

  assert.deepEqual(payload, {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: '5511999999999', type: 'interactive',
    interactive: {
      type: 'list', body: { text: 'Escolha um serviço' },
      action: { button: 'Ver serviços', sections: [{ title: 'Opções', rows: [
        { id: 'service:haircut', title: 'Corte', description: 'R$ 45,00' },
      ] }] },
    },
  })

  assert.throws(() => renderWhatsAppResponse('5511', {
    type: 'buttons', text: 'Escolha', options: [
      { id: '1', label: '1' }, { id: '2', label: '2' },
      { id: '3', label: '3' }, { id: '4', label: '4' },
    ],
  }))
})
