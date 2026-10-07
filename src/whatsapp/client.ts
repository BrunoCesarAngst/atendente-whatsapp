import type { Bindings } from '../env'

export async function sendWhatsAppText(
  env: Bindings,
  to: string,
  body: string,
) {
  const url =
    `https://graph.facebook.com/` +
    `${env.WHATSAPP_GRAPH_API_VERSION}/` +
    `${env.WHATSAPP_PHONE_NUMBER_ID}/messages`

  const response = await fetch(url, {
    method: 'POST',

    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',

      to,

      type: 'text',

      text: {
        preview_url: false,
        body,
      },
    }),
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(
      `WhatsApp API error ${response.status}: ${responseText}`,
    )
  }

  console.log('Mensagem enviada:', responseText)
}