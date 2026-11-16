# Arquitetura

## Visão geral

O projeto é um único Cloudflare Worker em TypeScript. Ele recebe eventos do
webhook do WhatsApp Cloud API, confirma o recebimento rapidamente e processa
mensagens em segundo plano. Um perfil de negócio seleciona uma jornada de agenda
automática ou de triagem para avaliação humana.

```text
Meta WhatsApp Cloud API
          |
          v
  src/index.ts (HTTP/Hono)
          |
          +--> src/whatsapp/types.ts (leitura do contrato externo)
          |
  +--> src/businesses/ (perfis e configuração do atendimento)
  +--> src/conversation/ (jornadas de agenda e triagem)
          |
          +--> src/whatsapp/client.ts (envio para a Cloud API)
```

## Componentes atuais

| Área | Responsabilidade |
| --- | --- |
| `src/index.ts` | Rotas de saúde, verificação do webhook e coordenação do processamento. |
| `src/whatsapp/types.ts` | Tipos e extração de mensagens de texto recebidas da Meta. |
| `src/whatsapp/client.ts` | Construção e envio de mensagens para a Cloud API. |
| `src/barbershop/` | Perfil de agenda e respostas determinísticas da barbearia. |
| `src/businesses/` | Contrato e perfis locais de barbearia, piscina e jardinagem. |
| `src/conversation/` | Seleção de jornada, agenda, triagem e disponibilidade. |
| `src/persistence/` | Porta de conversa, reservas e solicitações; adaptadores D1 e em memória. |
| `src/env.ts` | Contrato tipado dos bindings necessários em execução. |
| `wrangler.jsonc` | Configuração do Worker e valores públicos de runtime. |
| `tests/unit/` | Testes unitários executados por `npm test`. |

## Fluxo de mensagem

1. A Meta chama `GET /webhook` para verificação ou `POST /webhook` para eventos.
2. O Worker confirma eventos aceitos com `EVENT_RECEIVED`.
3. Eventos sem mensagem de texto são ignorados sem resposta ao cliente.
4. O perfil de negócio determina se a conversa conclui uma reserva ou coleta uma
   solicitação para avaliação humana.
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

## Perfis locais de validação

- **Barbearia**: serviço, data, horário e reserva automática.
- **Limpeza de piscina**: serviço, frequência, bairro e período preferido;
  cria solicitação pendente sem preço ou horário definitivo.
- **Jardinagem**: serviço, bairro, porte da área e período preferido; cria
  solicitação pendente sem preço ou horário definitivo.

Após uma solicitação, a conversa entra em modo humano. Nenhuma notificação
proativa ou orçamento automático é produzido nesta etapa.

## Evolução planejada

A configuração ainda é administrada localmente e selecionada por ambiente. Um
painel, múltiplos negócios no mesmo número, envio de notificações e orçamento
ficam para evolução posterior, após validação dos roteiros.
