import type { RequestBusinessConfig, TriageField } from '../businesses/config.ts'
import type { ConversationRepository } from '../persistence/conversation-repository.ts'
import type { JourneyEngine, JourneyResult } from './orchestrator.ts'
import type { ConversationState } from './state.ts'

function withStep(
  state: ConversationState,
  currentStep: string,
  context: Record<string, string> = {},
) {
  return {
    ...state,
    currentJourney: 'service_request',
    currentStep,
    context: { ...state.context, ...context },
  }
}

function responseForField(field: TriageField) {
  if (field.type === 'text') {
    return { type: 'text' as const, text: field.prompt }
  }

  const options = field.options ?? []
  if (options.length <= 3) {
    return {
      type: 'buttons' as const,
      text: field.prompt,
      options: options.map((option) => ({
        id: `field:${field.id}:${option.id}`,
        label: option.label,
      })),
    }
  }

  return {
    type: 'list' as const,
    text: field.prompt,
    buttonLabel: 'Ver opções',
    options: options.map((option) => ({
      id: `field:${field.id}:${option.id}`,
      label: option.label,
    })),
  }
}

function nextField(config: RequestBusinessConfig, state: ConversationState) {
  return config.triageFields.find((field) => !state.context[`field:${field.id}`])
}

export function createRequestJourneyEngine(
  repository: ConversationRepository,
  config: RequestBusinessConfig,
): JourneyEngine {
  return {
    async handle(state, input): Promise<JourneyResult> {
      const action = input.interactiveId ?? input.text?.trim().toLowerCase()

      if (action === 'request:start') {
        return {
          state: withStep(state, 'select_service'),
          responses: [{
            type: 'list',
            text: 'Qual serviço você precisa?',
            buttonLabel: 'Ver serviços',
            options: config.services.map((service) => ({
              id: `service:${service.id}`,
              label: service.name,
              ...(service.description ? { description: service.description } : {}),
            })),
          }],
        }
      }

      if (state.currentStep === 'select_service' && action?.startsWith('service:')) {
        const serviceId = action.slice('service:'.length)
        if (!config.services.some((service) => service.id === serviceId)) {
          return { state, responses: [{ type: 'text', text: 'Escolha um serviço da lista para continuar.' }] }
        }
        const firstField = config.triageFields[0]
        if (!firstField) {
          throw new Error('Request profile must define triage fields')
        }
        return {
          state: withStep(state, `field:${firstField.id}`, { serviceId }),
          responses: [responseForField(firstField)],
        }
      }

      const fieldId = state.currentStep.startsWith('field:')
        ? state.currentStep.slice('field:'.length)
        : undefined
      const field = config.triageFields.find((candidate) => candidate.id === fieldId)

      if (field) {
        const value = field.type === 'text'
          ? input.text?.trim()
          : action?.startsWith(`field:${field.id}:`)
            ? action.slice(`field:${field.id}:`.length)
            : undefined

        const validOption = field.type !== 'options' || field.options?.some((option) => option.id === value)
        if (!value || !validOption) {
          return { state, responses: [responseForField(field)] }
        }

        const advanced = withStep(state, 'collecting', { [`field:${field.id}`]: value })
        const pendingField = nextField(config, advanced)
        if (pendingField) {
          return {
            state: withStep(advanced, `field:${pendingField.id}`),
            responses: [responseForField(pendingField)],
          }
        }

        const serviceId = advanced.context.serviceId
        if (!serviceId) {
          return { state, responses: [{ type: 'text', text: 'Não encontrei o serviço solicitado. Vamos recomeçar.' }] }
        }
        const details = Object.fromEntries(config.triageFields.flatMap((triageField) => {
          const detail = advanced.context[`field:${triageField.id}`]
          return detail ? [[triageField.id, detail]] : []
        }))
        await repository.createServiceRequest({
          businessId: input.businessId,
          customerId: input.customerId,
          serviceId,
          details,
          createdAt: input.receivedAt,
        })
        return {
          state: { ...withStep(advanced, 'submitted'), mode: 'human' },
          responses: [{
            type: 'text',
            text: 'Seu pedido foi registrado. O profissional vai avaliar as informações e retornar para combinar os próximos passos.',
          }],
        }
      }

      return {
        state: { ...state, currentJourney: 'welcome', currentStep: 'offered_actions' },
        responses: [{
          type: 'buttons',
          text: `Olá! Como posso ajudar com ${config.name.toLowerCase()}?`,
          options: [{ id: 'request:start', label: 'Solicitar serviço' }],
        }],
      }
    },
  }
}
