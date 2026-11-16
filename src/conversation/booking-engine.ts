import type { BarbershopConfig } from '../barbershop/config.ts'
import { getBarbershopReply } from '../barbershop/assistant.ts'
import type { ConversationRepository } from '../persistence/conversation-repository.ts'
import { AvailabilityService } from './availability.ts'
import type { JourneyEngine, JourneyResult } from './orchestrator.ts'
import type { ConversationState } from './state.ts'

function formatDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function formatTime(slot: string) {
  return slot.slice(11, 16)
}

function nextAvailableDates(receivedAt: string, config: BarbershopConfig) {
  const dates: string[] = []
  const cursor = new Date(receivedAt)

  while (dates.length < 2) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    if (config.booking.weekdayHours[cursor.getUTCDay()]) {
      dates.push(cursor.toISOString().slice(0, 10))
    }
  }

  return dates
}

function withStep(state: ConversationState, currentStep: string, context: Record<string, string> = {}) {
  return { ...state, currentJourney: 'booking', currentStep, context: { ...state.context, ...context } }
}

export function createBookingJourneyEngine(
  repository: ConversationRepository,
  config: BarbershopConfig,
): JourneyEngine {
  const availability = new AvailabilityService(repository, config)

  return {
    async handle(state, input): Promise<JourneyResult> {
      const action = input.interactiveId ?? input.text?.trim().toLowerCase()

      if (input.text && /preço|preco|valor|quanto custa/u.test(input.text)) {
        return {
          state: { ...state, currentJourney: 'welcome', currentStep: 'price_direct' },
          responses: [{ type: 'text', text: getBarbershopReply(input.text, config) }],
        }
      }

      if (action === 'services:show') {
        return {
          state: { ...state, currentJourney: 'welcome', currentStep: 'services_shown' },
          responses: [{
            type: 'list', text: 'Nossos serviços:', buttonLabel: 'Ver serviços',
            options: config.services.map((service) => ({
              id: `service:${service.id}`,
              label: service.name,
              description: `R$ ${service.priceInReais.toFixed(2).replace('.', ',')}`,
            })),
          }],
        }
      }

      if (action === 'booking:start' || action?.includes('agendar')) {
        return {
          state: withStep(state, 'select_service'),
          responses: [{
            type: 'list', text: 'Qual serviço você deseja agendar?', buttonLabel: 'Ver serviços',
            options: config.services.map((service) => ({
              id: `service:${service.id}`,
              label: service.name,
              description: `${service.durationMinutes} min · R$ ${service.priceInReais.toFixed(2).replace('.', ',')}`,
            })),
          }],
        }
      }

      if (state.currentStep === 'select_service' && action?.startsWith('service:')) {
        const serviceId = action.slice('service:'.length)
        if (!config.services.some((service) => service.id === serviceId)) {
          return { state, responses: [{ type: 'text', text: 'Escolha um serviço da lista para continuar.' }] }
        }
        const dates = nextAvailableDates(input.receivedAt, config)
        return {
          state: withStep(state, 'select_date', { serviceId }),
          responses: [{
            type: 'buttons', text: 'Em qual dia você prefere?',
            options: dates.map((date) => ({ id: `date:${date}`, label: formatDate(date) })),
          }],
        }
      }

      if (state.currentStep === 'select_date' && action?.startsWith('date:')) {
        const date = action.slice('date:'.length)
        const slots = await availability.listSlots(date, state.context.serviceId ?? '')
        return {
          state: withStep(state, 'select_time', { date }),
          responses: slots.length === 0
            ? [{ type: 'text', text: 'Não há horários disponíveis nesse dia. Escolha outra data.' }]
            : [{ type: 'list', text: 'Escolha um horário disponível.', buttonLabel: 'Ver horários', options: slots.slice(0, 10).map((slot) => ({ id: `slot:${slot}`, label: formatTime(slot) })) }],
        }
      }

      if (state.currentStep === 'select_time' && action?.startsWith('slot:')) {
        const startsAt = action.slice('slot:'.length)
        const service = config.services.find((candidate) => candidate.id === state.context.serviceId)
        if (!service || !startsAt.startsWith(`${state.context.date}T`)) {
          return { state, responses: [{ type: 'text', text: 'Escolha um horário da lista para continuar.' }] }
        }
        return {
          state: withStep(state, 'confirm', { startsAt }),
          responses: [{
            type: 'buttons',
            text: `Confirmar ${service.name} em ${formatTime(startsAt)} no dia ${formatDate(state.context.date ?? '')}?`,
            options: [{ id: 'booking:confirm', label: 'Confirmar' }, { id: 'booking:start', label: 'Recomeçar' }],
          }],
        }
      }

      if (state.currentStep === 'confirm' && action === 'booking:confirm') {
        const service = config.services.find((candidate) => candidate.id === state.context.serviceId)
        const startsAt = state.context.startsAt
        if (!service || !startsAt) {
          return { state, responses: [{ type: 'text', text: 'Não encontrei os dados do agendamento. Vamos recomeçar.' }] }
        }
        const appointment = await repository.confirmAppointment({
          businessId: input.businessId, customerId: input.customerId, serviceId: service.id,
          professionalId: config.professional.id, startsAt, priceInReais: service.priceInReais,
          durationMinutes: service.durationMinutes,
        })
        if (!appointment) {
          return { state: withStep(state, 'select_time'), responses: [{ type: 'text', text: 'Esse horário acabou de ser reservado. Escolha outro horário, por favor.' }] }
        }
        return {
          state: withStep(state, 'booked'),
          responses: [{ type: 'text', text: `Seu horário está confirmado para ${formatTime(startsAt)} em ${formatDate(startsAt.slice(0, 10))}.` }],
        }
      }

      return {
        state: { ...state, currentJourney: 'welcome', currentStep: 'offered_actions' },
        responses: [{ type: 'buttons', text: 'Olá! Como posso ajudar?', options: [
          { id: 'booking:start', label: 'Agendar horário' },
          { id: 'services:show', label: 'Ver serviços' },
        ] }],
      }
    },
  }
}
