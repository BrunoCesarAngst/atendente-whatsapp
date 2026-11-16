import { barbershopConfig } from '../barbershop/config.ts'
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

const profiles: Record<string, BusinessConfig> = {
  barbershop: barbershopConfig,
  pool: poolCleaningConfig,
  gardening: gardeningConfig,
}

export function getBusinessProfile(profileName?: string): BusinessConfig {
  const selected = profiles[profileName ?? 'barbershop']
  if (!selected) {
    throw new Error('Business profile is not configured')
  }
  return selected
}
