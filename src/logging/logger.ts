export const operationalEvents = {
  webhook_verified: 'Callback verificado',
  webhook_verification_failed: 'Verificação do callback recusada',
  webhook_received: 'Webhook recebido',
  webhook_authenticated: 'Assinatura validada',
  webhook_signature_rejected: 'Assinatura recusada',
  webhook_invalid_json: 'JSON inválido',
  webhook_ignored: 'Evento sem mensagem utilizável',
  webhook_acknowledged: 'Recebimento confirmado',
  webhook_finished: 'Processamento do webhook encerrado',
  conversation_storage_not_configured: 'D1 indisponível na configuração',
  message_started: 'Mensagem em processamento',
  message_duplicate: 'Mensagem repetida ignorada',
  conversation_human_mode: 'Conversa sob atendimento humano',
  conversation_started: 'Conversa iniciada',
  conversation_loaded: 'Conversa recuperada',
  conversation_saved: 'Estado da conversa gravado',
  value_report_generated: 'Relatório de valor consultado',
  value_baseline_updated: 'Referência de tempo atualizada',
  value_hourly_cost_updated: 'Custo-hora atualizado',
  appointment_recorded: 'Reserva confirmada no D1 ou repositório local',
  appointment_conflict: 'Conflito de agenda',
  service_request_recorded: 'Solicitação de serviço registrada',
  whatsapp_send_started: 'Envio à Meta iniciado',
  whatsapp_send_succeeded: 'Envio aceito pela Meta',
  whatsapp_send_failed: 'Falha no envio à Meta',
  message_finished: 'Processamento da mensagem concluído',
  message_processing_failed: 'Falha no processamento',
} as const

export const conversationSteps = {
  start: 'início',
  offered_actions: 'menu',
  price_direct: 'consulta de preço',
  services_shown: 'catálogo',
  select_service: 'selecionar serviço',
  select_date: 'selecionar data',
  select_time: 'selecionar horário',
  confirm: 'confirmar reserva',
  booked: 'reserva confirmada',
  collecting: 'coleta da triagem',
  submitted: 'triagem registrada',
} as const

export type SafeEvent = keyof typeof operationalEvents
export type Outcome = 'success' | 'rejected' | 'failed' | 'ignored' | 'started'
export type LogDetails = {
  httpStatus?: number
  graphErrorCode?: number
  graphErrorSubcode?: number
  messageCount?: number
  responseCount?: number
  durationMs?: number
  messageType?: 'text' | 'interactive'
  step?: keyof typeof conversationSteps
  phase?: 'configuration' | 'conversation' | 'outbound'
}
export type OperationalLogger = (event: SafeEvent, outcome: Outcome, details?: LogDetails) => void

function writeLog(event: SafeEvent, outcome: Outcome, details: LogDetails = {}, traceId?: string, messageIndex?: number) {
  const { httpStatus, graphErrorCode, graphErrorSubcode, messageCount, responseCount, durationMs, messageType, phase, step } = details
  console.log(JSON.stringify({
    event, outcome, traceId, messageIndex, httpStatus, graphErrorCode, graphErrorSubcode,
    messageCount, responseCount, durationMs, messageType, phase, step,
  }))
}

export function logOperationalEvent(event: SafeEvent, outcome: Outcome, details?: LogDetails) {
  writeLog(event, outcome, details)
}

export function createRequestLogger(traceId: string, messageIndex?: number): OperationalLogger {
  return (event, outcome, details) => writeLog(event, outcome, details, traceId, messageIndex)
}
