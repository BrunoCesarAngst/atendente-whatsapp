import assert from 'node:assert/strict'
import test from 'node:test'

import { extractIncomingTextMessages } from '../../src/whatsapp/types.ts'

test('extrai somente mensagens de texto completas', () => {
  const messages = extractIncomingTextMessages({
    entry: [{
      changes: [{
        value: {
          messages: [
            { type: 'text', from: '5511999999999', id: 'wamid.1', text: { body: 'oi' } },
            { type: 'image', from: '5511999999999', id: 'wamid.2' },
            { type: 'text', from: '5511999999999', text: { body: 'incompleta' } },
          ],
        },
      }],
    }],
  })

  assert.deepEqual(messages, [{ from: '5511999999999', id: 'wamid.1', text: 'oi' }])
})
