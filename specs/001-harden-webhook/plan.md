# Implementation Plan: Hardening do Webhook

**Branch**: `001-harden-webhook` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Adicionar autenticação de origem ao `POST /webhook` por meio de
`X-Hub-Signature-256`, calculada sobre os bytes originais do corpo com o App
Secret da Meta. O fluxo autenticado continuará retornando `EVENT_RECEIVED` e
executando respostas de texto em segundo plano. Logs serão substituídos por
eventos operacionais sem conteúdo ou identificadores pessoais. A cobertura
unitária será adicionada para parsing e verificação, sem novas dependências,
serviços ou persistência.

## Technical Context

**Language/Version**: TypeScript, `ESNext`; Node.js 22.21.1 para testes locais

**Primary Dependencies**: Hono 4, Wrangler 4; APIs Web Crypto nativas do runtime

**Storage**: N/A — fora de escopo

**Testing**: executor nativo `node --test` com remoção experimental de tipos para
testes unitários TypeScript sem dependências adicionais; `npm run cf-typegen` para
sincronizar tipos de bindings

**Target Platform**: Cloudflare Workers e ambiente local Node.js 22

**Project Type**: serviço webhook HTTP sem estado

**Performance Goals**: eventos autenticados devem preservar a confirmação HTTP
imediata; validação não deve fazer I/O externo antes de responder

**Constraints**:

- Calcular HMAC SHA-256 sobre os bytes originais de `POST /webhook`; não sobre um
  JSON reserializado.
- Aceitar somente `X-Hub-Signature-256` no formato `sha256=<hex>` com digest de
  tamanho válido e comparar bytes com função resistente a timing.
- App Secret e tokens são segredos do ambiente, nunca configuração versionada.
- Produção não registra payload integral, texto, telefone, identificador de
  cliente, token, App Secret ou cabeçalhos de autorização.
- Não adicionar banco, Queue, Durable Objects, dependências npm ou mudanças de
  deploy para este hardening.
- Não executar deploy sem solicitação explícita do proprietário.

**Scale/Scope**: um endpoint de recepção existente, dois helpers unitários e
testes de unidade; sem alteração de rotas públicas válidas ou da resposta do bot

## Constitution Check

A constituição atual contém apenas placeholders, portanto não impõe gates
executáveis. Os gates desta feature são derivados da spec e das regras do
repositório:

- PASS — preserva o caminho funcional de eventos autenticados e a resposta
  assíncrona existente.
- PASS — secrets permanecem exclusivos do ambiente e não entram em fixtures.
- PASS — testes são definidos antes da alteração de comportamento.
- PASS — o domínio de parsing e verificação permanece separado de Hono, Meta e
  Cloudflare; o endpoint faz apenas adaptação HTTP.
- PASS — não introduz novos serviços, armazenamento ou dependências.
- PASS — o plano não contém deploy automático.

### Re-check after Phase 1 design

Os artefatos de design mantêm todos os gates acima. A interface HTTP proposta
preserva os fluxos válidos e restringe o novo comportamento apenas à rejeição de
requisições não autenticadas.

## Project Structure

### Documentation (this feature)

```text
specs/001-harden-webhook/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── webhook.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── env.ts
├── index.ts
└── whatsapp/
    ├── client.ts
    ├── signature.ts
    └── types.ts

tests/
└── unit/
    ├── whatsapp-signature.test.ts
    └── whatsapp-types.test.ts

worker-configuration.d.ts
```

**Structure Decision**: O projeto permanece um único Worker. `index.ts` lê os
bytes e adapta a requisição; `signature.ts` e `types.ts` ficam puros e testáveis.
`client.ts` continua isolando a integração de saída com a Meta.

## Complexity Tracking

Nenhuma violação de gate ou complexidade adicional exige justificativa.
