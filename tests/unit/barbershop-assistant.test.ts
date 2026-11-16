import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getBarbershopReply,
} from '../../src/barbershop/assistant.ts'

test('responde uma saudação em português', () => {
  const reply = getBarbershopReply('Olá, tudo bem?')

  assert.match(reply, /Olá! Você falou com a Barbearia Central\./)
  assert.match(reply, /serviços, preços e horários/)
})

test('informa os serviços disponíveis', () => {
  const reply = getBarbershopReply('Quais serviços vocês fazem?')

  assert.match(reply, /Nossos serviços:/)
  assert.match(reply, /Corte masculino/)
  assert.match(reply, /Corte \+ barba/)
})

test('informa preços com acentos ou sem acentos', () => {
  const accentedReply = getBarbershopReply('Quais são os preços?')
  const unaccentedReply = getBarbershopReply('qual o preco do corte?')

  assert.match(accentedReply, /Nossa tabela de preços:/)
  assert.match(accentedReply, /Corte masculino: R\$ 45,00/)
  assert.equal(unaccentedReply, accentedReply)
})

test('informa os horários de atendimento', () => {
  const reply = getBarbershopReply('Que horas vocês abrem?')

  assert.match(reply, /Nossos horários de atendimento:/)
  assert.match(reply, /Terça a sexta: 9h às 19h/)
  assert.match(reply, /Domingo e segunda: fechado/)
})

test('aceita configuração do estabelecimento fora da integração WhatsApp', () => {
  const reply = getBarbershopReply('preços', {
    mode: 'appointment',
    id: 'barbearia-teste',
    name: 'Barbearia de Teste',
    services: [{ id: 'kids', name: 'Corte infantil', priceInReais: 30, durationMinutes: 30 }],
    openingHours: ['Todos os dias: 10h às 18h'],
    timezone: 'America/Sao_Paulo',
    professional: { id: 'barber-test', name: 'Profissional de teste' },
    booking: { slotIntervalMinutes: 30, weekdayHours: {} },
  })

  assert.match(reply, /Corte infantil: R\$ 30,00/)
  assert.doesNotMatch(reply, /Corte masculino/)
})

test('oferece ajuda para mensagens não reconhecidas', () => {
  const reply = getBarbershopReply('Quero marcar para amanhã')

  assert.match(reply, /Posso informar nossos serviços, preços e horários/)
})
