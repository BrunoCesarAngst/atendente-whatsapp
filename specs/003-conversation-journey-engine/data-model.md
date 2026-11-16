# Modelo de dados

## Entidades persistidas

| Entidade | Campos principais | Regras |
| --- | --- | --- |
| Business | id, nome, timezone, owner_contact_ref | `id` estável; timezone obrigatória |
| Service | business_id, id, nome, preço, duração | ID estável; preço e duração positivos |
| Customer | id, business_id, channel_customer_key | chave do canal minimizada; única por negócio |
| Conversation | business_id, customer_id, journey, step, mode, context, version | uma por negócio/cliente; modo `automation` ou `human` |
| ProcessedMessage | business_id, message_id, customer_id | chave única para idempotência |
| Appointment | id, negócio, cliente, serviço, profissional, início, preço, status | máximo uma reserva confirmada por profissional/horário |
| Handoff | id, conversa, status, timestamps | registra pedido e notificação segura |

## Estados de conversa

`none` → `welcome` → `booking.select_service` → `booking.select_date` →
`booking.select_time` → `booking.confirm` → `booking.booked`.

Cancelamento e handoff podem começar de uma conversa existente. `mode=human`
bloqueia transições automáticas até uma retomada autorizada.

## Invariantes

- Uma ação de interface é aceita somente na etapa que a emitiu.
- Uma mensagem repetida não altera estado nem cria reserva novamente.
- Reserva confirmada contém snapshot de preço e duração.
- Identificadores de telefone e texto de cliente não aparecem em logs de produção.
