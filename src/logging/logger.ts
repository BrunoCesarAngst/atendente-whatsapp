export type SafeEvent =
  | 'webhook_verified'
  | 'webhook_verification_failed'
  | 'webhook_signature_rejected'
  | 'webhook_invalid_json'
  | 'webhook_ignored'
  | 'whatsapp_send_succeeded'
  | 'whatsapp_send_failed'
  | 'message_processing_failed'
  | 'conversation_storage_not_configured'

export function logOperationalEvent(
  event: SafeEvent,
  outcome: 'success' | 'rejected' | 'failed' | 'ignored',
  details?: {
    httpStatus?: number
    graphErrorCode?: number
    graphErrorSubcode?: number
  },
) {
  console.log(JSON.stringify({ event, outcome, ...details }))
}
