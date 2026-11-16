import type {
  Appointment,
  ConversationRepository,
  NewAppointment,
} from './conversation-repository.ts'
import type { ConversationState } from '../conversation/state.ts'

export class InMemoryConversationRepository
  implements ConversationRepository {
  private readonly conversations = new Map<string, ConversationState>()
  private readonly processedMessages = new Set<string>()
  private readonly appointments: Appointment[] = []

  async claimMessage(businessId: string, customerId: string, messageId: string) {
    const key = `${businessId}:${customerId}:${messageId}`

    if (this.processedMessages.has(key)) {
      return false
    }

    this.processedMessages.add(key)
    return true
  }

  async get(businessId: string, customerId: string) {
    return this.conversations.get(`${businessId}:${customerId}`) ?? null
  }

  async save(state: ConversationState) {
    this.conversations.set(
      `${state.businessId}:${state.customerId}`,
      structuredClone(state),
    )
  }

  async listAppointments(businessId: string, professionalId?: string) {
    return this.appointments.filter((appointment) =>
      appointment.businessId === businessId &&
      (!professionalId || appointment.professionalId === professionalId),
    )
  }

  async confirmAppointment(input: NewAppointment) {
    const conflict = this.appointments.some((appointment) =>
      appointment.businessId === input.businessId &&
      appointment.professionalId === input.professionalId &&
      appointment.startsAt === input.startsAt &&
      appointment.status === 'confirmed',
    )

    if (conflict) {
      return null
    }

    const appointment: Appointment = {
      ...input,
      id: `appointment-${this.appointments.length + 1}`,
      status: 'confirmed',
    }
    this.appointments.push(appointment)
    return appointment
  }
}
