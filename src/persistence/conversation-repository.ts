import type { ConversationState } from '../conversation/state.ts'

export type NewAppointment = {
  businessId: string
  customerId: string
  serviceId: string
  professionalId: string
  startsAt: string
  priceInReais: number
  durationMinutes: number
}

export type Appointment = NewAppointment & {
  id: string
  status: 'confirmed'
}

export interface ConversationRepository {
  claimMessage(businessId: string, customerId: string, messageId: string): Promise<boolean>
  get(businessId: string, customerId: string): Promise<ConversationState | null>
  save(state: ConversationState): Promise<void>
  listAppointments(businessId: string, professionalId?: string): Promise<Appointment[]>
  confirmAppointment(appointment: NewAppointment): Promise<Appointment | null>
}
