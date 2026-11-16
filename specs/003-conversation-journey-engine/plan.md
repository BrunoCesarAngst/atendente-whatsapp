# Implementation Plan: Motor de Jornadas Conversacionais

**Branch**: `003-conversation-journey-engine` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-conversation-journey-engine/spec.md`

## Summary

Evoluir o Worker existente gradualmente: autenticar e normalizar o webhook,
introduzir um contrato de resposta independente do WhatsApp, persistir estado e
reservas em D1, e construir jornadas determinísticas. IA e Flows ficam atrás de
interfaces opcionais e não participam da primeira reserva funcional.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript ESNext; Node.js 22 para testes locais

**Primary Dependencies**: Hono 4, Wrangler 4, APIs Web Crypto e Workers nativas

**Storage**: Cloudflare D1, um banco por ambiente, binding `DB`

**Testing**: `node --test` para unidades; integração HTTP local do Hono; D1 local
para migrations e constraints

**Target Platform**: Cloudflare Workers e WhatsApp Cloud API

**Project Type**: serviço webhook HTTP com domínio conversacional persistido

**Performance Goals**: confirmar eventos válidos imediatamente; não realizar I/O
externo antes de validar assinatura; reservar horário atomicamente

**Constraints**: preservar webhook atual; segredos exclusivos do ambiente; sem
deploy, migração remota, alteração de secrets ou chamadas proativas sem pedido
explícito; IA não toma decisões nem executa ferramentas diretamente

**Scale/Scope**: uma barbearia configurável e um profissional inicialmente;
interfaces preparadas para múltiplos negócios e provedores futuros

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

O arquivo de constituição contém placeholders; os gates efetivos vêm de
`AGENTS.md`, das decisões documentadas e do pedido aprovado.

- PASS — o Worker, as rotas e o fluxo de confirmação existente são preservados.
- PASS — domínio, Meta e Cloudflare permanecem em fronteiras distintas.
- PASS — D1 é justificado por estado durável e conflito de agenda; Queue e Durable
  Objects não são necessários para a primeira versão.
- PASS — assinatura, logs seguros e deduplicação precedem persistência de jornada.
- PASS — IA e Flows são opcionais e não bloqueiam a jornada determinística.
- PASS — testes, tipos e dry-run precedem qualquer pedido de publicação.

### Re-check after Phase 1 design

O modelo mantém a reserva e a deduplicação em operações transacionais, e as
respostas de domínio não importam contratos da Meta. Nenhum gate exige deploy.

## Project Structure

### Documentation (this feature)

```text
specs/003-conversation-journey-engine/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── index.ts
├── env/
├── logging/
├── whatsapp/{webhook,parser,renderer,client}/
├── conversation/
├── journeys/{welcome,booking,cancel,handoff}/
├── businesses/barber/
├── tools/{availability,appointments,handoff}/
├── persistence/d1/
└── ai/

tests/
├── integration/
└── unit/
```

**Structure Decision**: Um único Worker mantém `index.ts` como adaptador HTTP;
`whatsapp/` traduz a Meta; `conversation/`, `journeys/`, `businesses/` e `tools/`
formam o domínio; `persistence/d1/` traduz contratos de repositório.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Repositórios de persistência | Isolar D1 do motor de jornada | Acesso D1 no domínio acoplaria regras a infraestrutura |
