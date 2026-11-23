export type Bindings = Omit<CloudflareBindings, 'DB' | 'WHATSAPP_GRAPH_API_BASE_URL' | 'BUSINESS_PROFILE' | 'WHATSAPP_OWNER_ID'> & {
  WHATSAPP_APP_SECRET: string
  WHATSAPP_OWNER_ID?: string
  DB?: D1Database
  WHATSAPP_GRAPH_API_BASE_URL?: string
  BUSINESS_PROFILE?: string
}
