import {
  barbershopConfig,
  type BarbershopConfig,
} from './config.ts'

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function formatPrice(priceInReais: number) {
  return `R$ ${priceInReais.toFixed(2).replace('.', ',')}`
}

function formatServices(config: BarbershopConfig) {
  return config.services
    .map((service) => `- ${service.name}: ${formatPrice(service.priceInReais)}`)
    .join('\n')
}

function formatHours(config: BarbershopConfig) {
  return config.openingHours
    .map((openingHour) => `- ${openingHour}`)
    .join('\n')
}

function greeting(config: BarbershopConfig) {
  return `Olá! Você falou com a ${config.name}.\n\nPosso informar nossos serviços, preços e horários. O que você gostaria de saber?`
}

function services(config: BarbershopConfig) {
  return `Nossos serviços:\n${formatServices(config)}\n\nPara consultar valores, envie "preços". Para horários, envie "horários".`
}

function prices(config: BarbershopConfig) {
  return `Nossa tabela de preços:\n${formatServices(config)}`
}

function hours(config: BarbershopConfig) {
  return `Nossos horários de atendimento:\n${formatHours(config)}`
}

const priceTerms = [
  'preco',
  'precos',
  'valor',
  'valores',
  'quanto custa',
]

const hourTerms = [
  'horario',
  'horarios',
  'abre',
  'funciona',
  'atendimento',
]

const serviceTerms = [
  'servico',
  'servicos',
  'corte',
  'barba',
  'pezinho',
]

const greetingTerms = [
  'oi',
  'ola',
  'bom dia',
  'boa tarde',
  'boa noite',
]

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

export function getBarbershopReply(
  message: string,
  config: BarbershopConfig = barbershopConfig,
) {
  const text = normalize(message)

  if (includesAny(text, priceTerms)) {
    return prices(config)
  }

  if (includesAny(text, hourTerms)) {
    return hours(config)
  }

  if (includesAny(text, serviceTerms)) {
    return services(config)
  }

  if (includesAny(text, greetingTerms)) {
    return greeting(config)
  }

  return greeting(config)
}
