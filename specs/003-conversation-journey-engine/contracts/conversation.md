# Contratos de conversa

## Entrada normalizada

```ts
type IncomingMessage = {
  businessId: string
  customerId: string
  messageId: string
  receivedAt: string
  text?: string
  interactiveId?: string
}
```

Uma escolha interativa tem precedência sobre rótulo visível; exatamente uma fonte
de ação é esperada.

## Resposta de domínio

```ts
type ConversationResponse =
  | { type: 'text'; text: string }
  | { type: 'buttons'; text: string; options: ActionOption[] }
  | { type: 'list'; text: string; buttonLabel: string; options: ActionOption[] }
  | { type: 'flow'; flowId: string; token: string; data?: Record<string, string> }
```

IDs são estáveis, por exemplo `booking:start`, `service:haircut`,
`slot:2026-10-08T18:10:00-03:00`, `booking:confirm` e `handoff:start`.

## Interpretação de intenção

```ts
type IntentInterpretation = {
  intent: string
  confidence: number
  entities: Record<string, string>
}
```

A interpretação é entrada não confiável: schema, confiança e compatibilidade com
a etapa são verificados antes de qualquer transição.
