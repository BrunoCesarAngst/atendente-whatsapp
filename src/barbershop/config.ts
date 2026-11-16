export type BarbershopService = {
  id: string
  name: string
  priceInReais: number
  durationMinutes: number
}

export type BarbershopConfig = {
  mode: 'appointment'
  id: string
  name: string
  services: BarbershopService[]
  openingHours: string[]
  timezone: string
  professional: {
    id: string
    name: string
  }
  booking: {
    slotIntervalMinutes: number
    weekdayHours: Partial<Record<number, { startHour: number, endHour: number }>>
  }
}

export const barbershopConfig: BarbershopConfig = {
  mode: 'appointment',
  id: 'barbearia-central',
  name: 'Barbearia Central',

  services: [
    { id: 'haircut', name: 'Corte masculino', priceInReais: 45, durationMinutes: 45 },
    { id: 'beard', name: 'Barba', priceInReais: 35, durationMinutes: 30 },
    { id: 'haircut-beard', name: 'Corte + barba', priceInReais: 70, durationMinutes: 75 },
    { id: 'trim', name: 'Pezinho', priceInReais: 20, durationMinutes: 20 },
  ],

  openingHours: [
    'Terça a sexta: 9h às 19h',
    'Sábado: 9h às 17h',
    'Domingo e segunda: fechado',
  ],
  timezone: 'America/Sao_Paulo',
  professional: { id: 'barber-1', name: 'Profissional principal' },
  booking: {
    slotIntervalMinutes: 30,
    weekdayHours: {
      2: { startHour: 9, endHour: 19 },
      3: { startHour: 9, endHour: 19 },
      4: { startHour: 9, endHour: 19 },
      5: { startHour: 9, endHour: 19 },
      6: { startHour: 9, endHour: 17 },
    },
  },
}
