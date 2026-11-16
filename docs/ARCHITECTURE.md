# Arquitetura

## Visão geral

O projeto é um único Cloudflare Worker em TypeScript. Ele recebe eventos do
webhook do WhatsApp Cloud API, confirma o recebimento rapidamente e processa
mensagens de texto em segundo plano.

```text
Meta WhatsApp Cloud API
          |
          v
  src/index.ts (HTTP/Hono)
          |
          +--> src/whatsapp/types.ts (leitura do contrato externo)
          |
          +--> src/barbershop/ (regras e configuração do atendimento)
          |
          +--> src/whatsapp/client.ts (envio para a Cloud API)
```

## Componentes atuais

| Área | Responsabilidade |
| --- | --- |
| `src/index.ts` | Rotas de saúde, verificação do webhook e coordenação do processamento. |
| `src/whatsapp/types.ts` | Tipos e extração de mensagens de texto recebidas da Meta. |
| `src/whatsapp/client.ts` | Construção e envio de mensagens para a Cloud API. |
| `src/barbershop/` | Configuração da barbearia e respostas determinísticas de domínio. |
| `src/env.ts` | Contrato tipado dos bindings necessários em execução. |
| `wrangler.jsonc` | Configuração do Worker e valores públicos de runtime. |
| `tests/unit/` | Testes unitários executados por `npm test`. |

## Fluxo de mensagem

1. A Meta chama `GET /webhook` para verificação ou `POST /webhook` para eventos.
2. O Worker confirma eventos aceitos com `EVENT_RECEIVED`.
3. Eventos sem mensagem de texto são ignorados sem resposta ao cliente.
4. Para cada texto recebido, o domínio determina a resposta.
5. O adaptador WhatsApp envia a resposta pela Cloud API.

O hardening de assinatura e a redução de logs sensíveis estão especificados em
`specs/001-harden-webhook/`; não devem ser presumidos como concluídos até sua
implementação e cobertura de testes.

## Fronteiras obrigatórias

- O domínio não conhece Hono, Cloudflare Workers, D1 ou payloads da Meta.
- `src/whatsapp/` traduz somente contratos da Meta; não contém regras da
  barbearia, disponibilidade ou jornada.
- `src/index.ts` adapta HTTP e orquestra dependências; não concentra decisões de
  negócio.
- Configuração do estabelecimento permanece independente de adaptadores e
  repositórios.
- Infraestrutura futura, como D1, deve ser acessada por uma porta definida pelo
  domínio, nunca diretamente pelas regras de conversa.

## Configuração e segredos

`WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_GRAPH_API_VERSION` são configuração de
runtime. Tokens de acesso, tokens de verificação e App Secret são segredos do
ambiente e não pertencem ao Git, a fixtures ou a logs.

## Evolução planejada

A especificação `specs/002-booking-journey/` propõe conversa persistida e D1.
Enquanto ela não for implementada e validada, a arquitetura efetiva permanece
sem estado persistente e com respostas determinísticas.
