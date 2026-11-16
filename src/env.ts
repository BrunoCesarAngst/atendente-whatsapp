export type Bindings = Omit<CloudflareBindings, 'DB' | 'WHATSAPP_GRAPH_API_BASE_URL' | 'BUSINESS_PROFILE'> & {
  WHATSAPP_APP_SECRET: string
  DB?: D1Database
  WHATSAPP_GRAPH_API_BASE_URL?: string
  BUSINESS_PROFILE?: string
}
