import type { ConversationState } from '../conversation/state.ts'
import type {
  Appointment,
  ConversationRepository,
  NewAppointment,
} from './conversation-repository.ts'

export class D1ConversationRepository implements ConversationRepository {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }

  async claimMessage(businessId: string, customerId: string, messageId: string) {
    const result = await this.database.prepare(
      'INSERT OR IGNORE INTO processed_messages (business_id, customer_id, message_id) VALUES (?, ?, ?)',
    ).bind(businessId, customerId, messageId).run()
    return result.meta.changes === 1
  }

  async get(businessId: string, customerId: string): Promise<ConversationState | null> {
    const row = await this.database.prepare(
      'SELECT current_journey, current_step, mode, context_json, created_at, updated_at FROM conversations WHERE business_id = ? AND customer_id = ?',
    ).bind(businessId, customerId).first<{
      current_journey: string
      current_step: string
      mode: ConversationState['mode']
      context_json: string
      created_at: string
      updated_at: string
    }>()

    return row && {
      businessId,
      customerId,
      currentJourney: row.current_journey,
      currentStep: row.current_step,
      mode: row.mode,
      context: JSON.parse(row.context_json) as Record<string, string>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async save(state: ConversationState) {
    await this.database.prepare(`
      INSERT INTO conversations (business_id, customer_id, current_journey, current_step, mode, context_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(business_id, customer_id) DO UPDATE SET
        current_journey = excluded.current_journey,
        current_step = excluded.current_step,
        mode = excluded.mode,
        context_json = excluded.context_json,
        updated_at = excluded.updated_at
    `).bind(
      state.businessId, state.customerId, state.currentJourney, state.currentStep,
      state.mode, JSON.stringify(state.context), state.createdAt, state.updatedAt,
    ).run()
  }

  async listAppointments(businessId: string, professionalId?: string): Promise<Appointment[]> {
    const query = professionalId
      ? 'SELECT * FROM appointments WHERE business_id = ? AND professional_id = ? AND status = \'confirmed\''
      : 'SELECT * FROM appointments WHERE business_id = ? AND status = \'confirmed\''
    const statement = professionalId
      ? this.database.prepare(query).bind(businessId, professionalId)
      : this.database.prepare(query).bind(businessId)
    const result = await statement.all<{
      id: string; business_id: string; customer_id: string; service_id: string; professional_id: string
      starts_at: string; price_in_reais: number; duration_minutes: number; status: 'confirmed'
    }>()
    return result.results.map((row) => ({
      id: row.id, businessId: row.business_id, customerId: row.customer_id,
      serviceId: row.service_id, professionalId: row.professional_id, startsAt: row.starts_at,
      priceInReais: row.price_in_reais, durationMinutes: row.duration_minutes, status: row.status,
    }))
  }

  async confirmAppointment(input: NewAppointment): Promise<Appointment | null> {
    const id = crypto.randomUUID()
    const result = await this.database.prepare(`
      INSERT OR IGNORE INTO appointments (id, business_id, customer_id, service_id, professional_id, starts_at, price_in_reais, duration_minutes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `).bind(
      id, input.businessId, input.customerId, input.serviceId, input.professionalId,
      input.startsAt, input.priceInReais, input.durationMinutes,
    ).run()
    return result.meta.changes === 1 ? { ...input, id, status: 'confirmed' } : null
  }
}
