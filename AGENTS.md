# Instruções para agentes

## Prioridades inegociáveis

1. Preserve o fluxo WhatsApp existente: verificação do webhook, confirmação
   `EVENT_RECEIVED`, processamento assíncrono e envio pela Cloud API da Meta.
2. Nunca versione credenciais, tokens, App Secret, arquivos `.env`, `.dev.vars`,
   respostas HTTP sensíveis, headers de autorização ou dados reais de clientes.
3. Faça mudanças pequenas, focadas e reversíveis. Não misture refatorações
   amplas com alterações de comportamento.
4. Escreva ou atualize testes antes de considerar uma mudança pronta e execute
   `npm test` antes de solicitar deploy.
5. Nunca execute `npm run deploy`, `wrangler deploy`, migrações remotas ou
   qualquer publicação sem solicitação explícita do proprietário nesta conversa.

## Fronteiras de arquitetura

- `src/index.ts` é o adaptador HTTP: recebe o webhook, valida entradas e agenda
  trabalho assíncrono. Não deve conter regras de conversa ou payloads da Meta.
- `src/whatsapp/` isola contratos do webhook e a Cloud API da Meta.
- Regras de negócio e configuração do estabelecimento ficam fora de
  `src/whatsapp/`, Cloudflare e persistência.
- Adaptadores de infraestrutura (Meta, Hono, Cloudflare Workers, D1) não devem
  definir regras de domínio.
- Novos serviços, dependências de produção, persistência ou integrações externas
  exigem decisão documentada em `docs/DECISIONS.md`.

## Segurança e operação

- Valide a autenticidade de eventos da Meta antes de interpretar ou processar o
  corpo, conforme a especificação de hardening aplicável.
- Logs de produção devem conter somente eventos operacionais seguros; nunca
  texto de mensagem, telefone, identificadores de cliente, payload completo,
  token, segredo ou header de autorização.
- Use bindings e secrets do ambiente para valores sensíveis. Não coloque
  placeholders que pareçam credenciais em exemplos ou testes.
- Preserve contratos públicos válidos; alterações de rota, status HTTP ou formato
  de resposta exigem testes de regressão e documentação.

## Verificação

- Para alterações de TypeScript: execute `npm test`.
- Para mudanças em `wrangler.jsonc`: execute `npm run cf-typegen` quando os
  bindings gerados forem afetados, além dos testes.
- Antes de qualquer publicação solicitada explicitamente, informe os comandos,
  o ambiente-alvo e os resultados de validação; aguarde autorização explícita
  para executar a publicação.
