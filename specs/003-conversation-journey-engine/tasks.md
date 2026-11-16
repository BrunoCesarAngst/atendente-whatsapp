# Tasks: Motor de Jornadas Conversacionais

**Input**: Design documents from `/specs/003-conversation-journey-engine/`

**Tests**: Obrigatórios; escrever primeiro e confirmar a falha antes da respectiva implementação.

## Phase 1: Baseline e hardening

- [x] T001 Criar testes de parsing, assinatura e endpoint em `tests/unit/whatsapp-types.test.ts`, `tests/unit/whatsapp-signature.test.ts` e `tests/integration/webhook.test.ts`
- [x] T002 [P] Criar `src/whatsapp/webhook/signature.ts` com HMAC Web Crypto e comparação segura
- [x] T003 [P] Criar `src/logging/logger.ts` com eventos estruturados e redaction
- [x] T004 Atualizar `src/env.ts` e tipos gerados para incluir `WHATSAPP_APP_SECRET` sem valor versionado
- [x] T005 Atualizar `src/index.ts` para validar bytes brutos antes do JSON, preservar `EVENT_RECEIVED` e remover logs sensíveis
- [x] T006 Atualizar `src/whatsapp/client.ts` para não registrar resposta externa nem interpolar conteúdo sensível em erros

## Phase 2: Foundation de estado e respostas

- [x] T007 Criar schema e migrations D1 em `migrations/0001_conversation_engine.sql` para businesses, services, customers, conversations, processed_messages, appointments e handoffs
- [x] T008 [P] Criar contratos em `src/conversation/state.ts`, `src/conversation/responses.ts` e `src/persistence/repositories.ts`
- [x] T009 [P] Criar testes de estado, deduplicação e resposta em `tests/unit/conversation-state.test.ts` e `tests/unit/response-model.test.ts`
- [x] T010 Criar repositórios D1 parametrizados e repositório em memória em `src/persistence/d1/` e `src/persistence/in-memory-repository.ts`
- [ ] T011 Atualizar `wrangler.jsonc` com binding D1 somente após identificar banco e ambiente local, e regenerar tipos

## Phase 3: User Story 1 - Agendamento determinístico (P1)

**Goal**: concluir uma reserva única com retomada de conversa.

- [x] T012 [P] [US1] Criar testes de disponibilidade e confirmação concorrente em `tests/unit/availability.test.ts` e `tests/unit/booking-journey.test.ts`
- [x] T013 [P] [US1] Expandir negócio configurável em `src/businesses/barber/config.ts` com IDs, preços, duração e timezone
- [x] T014 [US1] Implementar `AvailabilityService` em `src/tools/availability/availability-service.ts`
- [x] T015 [US1] Implementar jornada de booking em `src/journeys/booking/engine.ts`
- [x] T016 [US1] Implementar criação transacional de reserva em `src/tools/appointments/appointment-service.ts`
- [x] T017 [US1] Conectar orquestrador e webhook em `src/conversation/orchestrator.ts` e `src/index.ts`

## Phase 4: User Story 2 - Respostas híbridas (P1)

**Goal**: aceitar texto livre e escolhas por IDs estáveis.

- [ ] T018 [P] [US2] Criar testes de replies e renderers em `tests/unit/whatsapp-interactive.test.ts`
- [ ] T019 [US2] Estender parser em `src/whatsapp/parser/incoming-message.ts` para `button_reply` e `list_reply`
- [ ] T020 [US2] Implementar renderers text, buttons e list em `src/whatsapp/renderer/`
- [ ] T021 [US2] Atualizar `src/whatsapp/client/graph-api.ts` para delegar ao renderer validado
- [ ] T022 [US2] Implementar welcome, serviços e preço direto em `src/journeys/welcome/`

## Phase 5: User Stories 3 e 4 - Handoff e gestão (P2)

- [ ] T023 [P] [US3] Criar testes de handoff em `tests/unit/handoff.test.ts`
- [ ] T024 [P] [US4] Criar testes de cancelamento e remarcação em `tests/unit/appointment-management.test.ts`
- [ ] T025 [US3] Implementar jornada, modo humano e notificador seguro em `src/journeys/handoff/` e `src/tools/handoff/`
- [ ] T026 [US4] Implementar cancelamento e remarcação em `src/journeys/cancel/` e `src/tools/appointments/`

## Phase 6: IA e Flows opcionais

- [ ] T027 [P] Criar schemas e testes de interpretação/fallback em `src/ai/schema.ts`, `src/ai/intent-interpreter.ts` e `tests/unit/intent-interpreter.test.ts`
- [ ] T028 Implementar provider opcional sem chave versionada em `src/ai/provider.ts`
- [ ] T029 Criar `FlowResponse` e renderer inativo sem configuração em `src/whatsapp/renderer/flow.ts`
- [ ] T030 Documentar configuração de Flows e templates em `docs/ARCHITECTURE.md`

## Final Phase: validação

- [ ] T031 Executar migrations somente localmente, `npm test`, typecheck, `npm run cf-typegen`, `git diff --check` e dry-run
- [ ] T032 Revisar logs, Git e configuração para garantir ausência de credenciais e dados pessoais
- [ ] T033 Solicitar autorização explícita antes de qualquer migração remota, deploy, alteração de secret ou configuração de produção

## Dependências

`T001–T006 → T007–T011 → US1 → US2 → US3/US4 → T027–T033`.

O MVP é T001–T017: webhook seguro e agendamento determinístico. IA e Flows não
bloqueiam nenhuma jornada principal.
