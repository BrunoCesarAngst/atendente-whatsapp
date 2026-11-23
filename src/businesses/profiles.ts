import { barbershopConfig, type BarbershopConfig } from '../barbershop/config.ts'
import type { BusinessConfig, RequestBusinessConfig } from './config.ts'

export const poolCleaningConfig: RequestBusinessConfig = {
  mode: 'request',
  id: 'limpeza-piscina-demo',
  name: 'Limpeza de piscina',
  services: [
    { id: 'pool-cleaning', name: 'Limpeza de piscina', description: 'Avaliação antes da confirmação' },
    { id: 'pool-maintenance', name: 'Manutenção recorrente', description: 'Avaliação antes da confirmação' },
  ],
  triageFields: [
    {
      id: 'frequency',
      prompt: 'Com que frequência você precisa do serviço?',
      type: 'options',
      options: [
        { id: 'one-off', label: 'Uma vez' },
        { id: 'recurring', label: 'Recorrente' },
      ],
    },
    {
      id: 'neighborhood',
      prompt: 'Em qual bairro fica a piscina?',
      type: 'text',
    },
    {
      id: 'preferred_period',
      prompt: 'Qual período você prefere para a avaliação?',
      type: 'options',
      options: [
        { id: 'this-week', label: 'Esta semana' },
        { id: 'next-week', label: 'Próxima semana' },
        { id: 'no-preference', label: 'Sem preferência' },
      ],
    },
  ],
}

export const gardeningConfig: RequestBusinessConfig = {
  mode: 'request',
  id: 'jardinagem-demo',
  name: 'Corte de grama e jardinagem',
  services: [
    { id: 'lawn-mowing', name: 'Corte de grama', description: 'Avaliação antes da confirmação' },
    { id: 'gardening', name: 'Jardinagem', description: 'Avaliação antes da confirmação' },
  ],
  triageFields: [
    {
      id: 'neighborhood',
      prompt: 'Em qual bairro fica o serviço?',
      type: 'text',
    },
    {
      id: 'area_size',
      prompt: 'Qual o porte aproximado da área?',
      type: 'options',
      options: [
        { id: 'small', label: 'Pequena' },
        { id: 'medium', label: 'Média' },
        { id: 'large', label: 'Grande' },
      ],
    },
    {
      id: 'preferred_period',
      prompt: 'Qual período você prefere para a avaliação?',
      type: 'options',
      options: [
        { id: 'this-week', label: 'Esta semana' },
        { id: 'next-week', label: 'Próxima semana' },
        { id: 'no-preference', label: 'Sem preferência' },
      ],
    },
  ],
}

const salonConfig: BarbershopConfig = {
  ...barbershopConfig,
  id: 'salao-demo',
  name: 'Salão Aurora',
  professional: { id: 'stylist-1', name: 'Profissional principal' },
  services: [
    { id: 'salon-haircut', name: 'Corte feminino', priceInReais: 70, durationMinutes: 60 },
    { id: 'blowout', name: 'Escova', priceInReais: 55, durationMinutes: 45 },
    { id: 'hydration', name: 'Hidratação', priceInReais: 90, durationMinutes: 60 },
  ],
}

const profiles: Record<string, BusinessConfig> = {
  barbershop: barbershopConfig,
  salon: salonConfig,
  pool: poolCleaningConfig,
  gardening: gardeningConfig,
}

export function getBusinessProfile(profileName?: string): BusinessConfig {
  const name = profileName ?? 'barbershop'
  if (!Object.hasOwn(profiles, name)) {
    throw new Error('Business profile is not configured')
  }
  return profiles[name]
}

export function getBusinessRoutes(primaryPhoneId: string, primaryProfile?: string, configuredRoutes?: string) {
  if (configuredRoutes === undefined) {
    return new Map([[primaryPhoneId, getBusinessProfile(primaryProfile)]])
  }

  const config: unknown = JSON.parse(configuredRoutes)
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Invalid business routes configuration')
  }
  const routes = new Map<string, BusinessConfig>()
  const businessIds = new Set<string>()
  for (const [phoneId, profile] of Object.entries(config)) {
    if (!phoneId || phoneId.trim() !== phoneId || typeof profile !== 'string') {
      throw new Error('Invalid business route')
    }
    const business = getBusinessProfile(profile)
    if (businessIds.has(business.id)) {
      throw new Error('Business routes must use distinct business IDs')
    }
    businessIds.add(business.id)
    routes.set(phoneId, business)
  }
  return routes
}

export function getBusinessOwners(
  primaryPhoneId: string,
  primaryOwner?: string,
  configuredOwners?: string,
): Map<string, string> | null {
  if (configuredOwners === undefined) {
    return new Map(primaryOwner ? [[primaryPhoneId, primaryOwner]] : [])
  }

  let config: unknown
  try {
    config = JSON.parse(configuredOwners)
  } catch {
    return null
  }
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    return null
  }
  const owners = new Map<string, string>()
  for (const [phoneId, ownerId] of Object.entries(config)) {
    if (!phoneId || phoneId.trim() !== phoneId ||
      typeof ownerId !== 'string' || !ownerId || ownerId.trim() !== ownerId) {
      return null
    }
    owners.set(phoneId, ownerId)
  }
  return owners
}
