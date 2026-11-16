import type { BarbershopConfig } from '../barbershop/config.ts'

export type TriageOption = {
  id: string
  label: string
}

export type TriageField = {
  id: string
  prompt: string
  type: 'text' | 'options'
  options?: TriageOption[]
}

export type RequestService = {
  id: string
  name: string
  description?: string
}

export type RequestBusinessConfig = {
  mode: 'request'
  id: string
  name: string
  services: RequestService[]
  triageFields: TriageField[]
}

export type BusinessConfig = BarbershopConfig | RequestBusinessConfig
