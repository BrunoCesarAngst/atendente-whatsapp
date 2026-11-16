# Modelo de dados

## Conversa

| Campo | Regra |
| --- | --- |
| business_id | obrigatório; `barbearia-central` na primeira versão |
| customer_id | obrigatório; identificador WhatsApp minimizado no acesso e logs |
| journey | `booking` ou `none` |
| step | `select_service`, `select_date`, `select_time`, `confirm`, `human` ou `done` |
| context | serviço, data e horário coletados; JSON limitado à jornada |
| mode | `automation` ou `human` |
| updated_at | obrigatório |

Chave única: `(business_id, customer_id)`.

## Reserva

| Campo | Regra |
| --- | --- |
| id | identificador interno |
| business_id, professional_id | obrigatórios |
| customer_id, service_id | obrigatórios |
| starts_at | obrigatório, no fuso do estabelecimento convertido a instante |
| price_in_cents | obrigatório; preço acordado na confirmação |
| status | `confirmed` ou `cancelled` |

Índice único parcial: `(business_id, professional_id, starts_at)` para reservas
`confirmed`.

## Mensagem processada

Guarda `message_id` por empresa para tornar o processamento idempotente.
