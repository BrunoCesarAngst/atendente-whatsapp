import type { BarbershopConfig } from '../barbershop/config.ts'
import type { ConversationRepository } from '../persistence/conversation-repository.ts'
import { appointmentsOverlap } from './appointment-overlap.ts'

function dateAt(date: string, hour: number, minute: number) {
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`
}

export class AvailabilityService {
  private readonly repository: ConversationRepository
  private readonly config: BarbershopConfig

  constructor(
    repository: ConversationRepository,
    config: BarbershopConfig,
  ) {
    this.repository = repository
    this.config = config
  }

  async listSlots(date: string, serviceId: string): Promise<string[]> {
    const service = this.config.services.find((candidate) => candidate.id === serviceId)
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    const hours = this.config.booking.weekdayHours[weekday]

    if (!service || !hours) {
      return []
    }

    const appointments = await this.repository.listAppointments(
      this.config.id,
      this.config.professional.id,
    )
    const slots: string[] = []

    for (let minuteOfDay = hours.startHour * 60;
      minuteOfDay + service.durationMinutes <= hours.endHour * 60;
      minuteOfDay += this.config.booking.slotIntervalMinutes) {
      const startsAt = dateAt(date, Math.floor(minuteOfDay / 60), minuteOfDay % 60)
      if (!appointments.some((appointment) => appointmentsOverlap(
        startsAt,
        service.durationMinutes,
        appointment.startsAt,
        appointment.durationMinutes,
      ))) {
        slots.push(startsAt)
      }
    }

    return slots
  }
}
