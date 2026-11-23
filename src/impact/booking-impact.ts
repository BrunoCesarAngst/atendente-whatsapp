import type { ConversationResponse } from '../conversation/responses.ts'
import type { ConversationRepository } from '../persistence/conversation-repository.ts'

export type BookingImpactTotals = {
  automatedBookings: number
  estimatedBookings: number
  savedSeconds: number
  hourlyCostCents: number | null
}

export interface BookingImpactRepository extends Pick<ConversationRepository, 'claimMessage'> {
  getBookingImpact(businessId: string, after: string, through: string): Promise<BookingImpactTotals>
  setBookingBaseline(businessId: string, seconds: number, sampleSize: number): Promise<void>
  setBookingHourlyCost(businessId: string, cents: number): Promise<void>
}

type OwnerMessage = {
  businessId: string
  ownerId: string
  messageId: string
  receivedAt: string
  text: string
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor(totalSeconds / 60) % 60
  const seconds = totalSeconds % 60
  return [hours && `${hours} h`, minutes && `${minutes} min`, seconds && `${seconds} s`]
    .filter(Boolean).join(' ') || '0 min'
}

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function renderImpact(totals: BookingImpactTotals) {
  const { automatedBookings, estimatedBookings, savedSeconds, hourlyCostCents } = totals
  const lines = [
    'Valor do AtendenteG · últimos 30 dias',
    `Reservas gravadas automaticamente: ${automatedBookings}`,
    `Com referência de tempo: ${estimatedBookings} de ${automatedBookings}`,
  ]

  if (estimatedBookings === 0) {
    lines.push('Sem estimativa de tempo para o período. Para medir as próximas reservas, envie /calibrar seguido da duração em segundos de 3 a 15 agendamentos manuais.')
    return lines.join('\n')
  }

  lines.push(`Tempo poupado (estimativa): ${formatDuration(savedSeconds)}`)
  lines.push('Base: tempo ativo dos agendamentos manuais medidos pelo seu negócio.')
  if (hourlyCostCents !== null && hourlyCostCents > 0) {
    const equivalentReais = savedSeconds / 3600 * hourlyCostCents / 100
    lines.push(`Equivalência do tempo: ${reais.format(equivalentReais)} à taxa atual de ${reais.format(hourlyCostCents / 100)}/h.`)
  }
  return lines.join('\n')
}

function text(message: string): ConversationResponse[] {
  return [{ type: 'text', text: message }]
}

export async function handleBookingImpactCommand(
  repository: BookingImpactRepository,
  input: OwnerMessage,
): Promise<ConversationResponse[] | null> {
  const [first, ...parameters] = input.text.trim().split(/\s+/)
  const command = first.toLowerCase()
  if (command !== '/valor' && command !== '/calibrar' && command !== '/custo-hora') {
    return null
  }

  const { businessId, ownerId, messageId, receivedAt } = input
  if (!await repository.claimMessage(businessId, ownerId, messageId)) {
    return []
  }

  if (command === '/valor') {
    if (parameters.length !== 0) return text('Envie /valor para ver os últimos 30 dias.')
    const after = new Date(Date.parse(receivedAt) - 30 * 86400 * 1000).toISOString()
    return text(renderImpact(await repository.getBookingImpact(businessId, after, receivedAt)))
  }

  if (command === '/calibrar') {
    const samples = parameters.map(Number)
    if (samples.length < 3 || samples.length > 15 ||
      parameters.some((value, index) => !/^\d+$/.test(value) || samples[index] < 1 || samples[index] > 86400)) {
      return text('Informe de 3 a 15 tempos ativos medidos em segundos, separados por espaço. Exemplo: /calibrar 90 120 150')
    }
    samples.sort((a, b) => a - b)
    const middle = Math.floor(samples.length / 2)
    const median = samples.length % 2 === 1
      ? samples[middle]
      : Math.round((samples[middle - 1] + samples[middle]) / 2)
    await repository.setBookingBaseline(businessId, median, samples.length)
    return text(`Calibração para as próximas reservas. Mediana: ${formatDuration(median)} em ${samples.length} amostras.`)
  }

  if (parameters.length !== 1 || !/^\d{1,6}(?:[,.]\d{1,2})?$/.test(parameters[0])) {
    return text('Informe o custo de uma hora em reais. Exemplo: /custo-hora 60,00. Envie /custo-hora 0 para retirar a equivalência em reais.')
  }
  const [whole, fraction = ''] = parameters[0].split(/[,.]/)
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  await repository.setBookingHourlyCost(businessId, cents)
  return text(cents === 0
    ? 'Equivalência em reais desativada. O relatório continua mostrando o tempo.'
    : `Custo-hora de referência atualizado para ${reais.format(cents / 100)}. O relatório usa essa taxa para converter o tempo estimado.`)
}
