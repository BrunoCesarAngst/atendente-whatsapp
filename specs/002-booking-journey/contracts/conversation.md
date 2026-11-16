# Contrato do motor de conversa

## Entrada normalizada

```text
customerId, messageId, text? ou interactiveId?, receivedAt
```

Exatamente um de `text` ou `interactiveId` é esperado. `interactiveId` tem
precedência sobre rótulo visível.

## Saída de domínio

```text
{ type: "text", body }
{ type: "buttons", body, options: [{ id, label }] }
{ type: "list", body, buttonLabel, options: [{ id, label, description? }] }
```

IDs são constantes internas de ação, por exemplo `booking:start`,
`service:haircut`, `date:tomorrow`, `time:2026-10-08T18:10:00-03:00`,
`booking:confirm`, `booking:cancel` e `handoff:start`.

## Invariantes

- Ações que não correspondem à etapa atual não alteram reserva ou conversa.
- Uma confirmação de reserva retorna sucesso uma vez; duplicatas repetem a resposta
  segura já calculada ou não fazem alteração.
- Handoff define o modo humano e impede respostas automáticas até reversão explícita.
