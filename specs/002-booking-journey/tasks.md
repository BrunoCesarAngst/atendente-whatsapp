# Tasks: Jornada de Agendamento

**Input**: Design documents from `/specs/002-booking-journey/`

## Phase 1: Setup

- [ ] T001 Add a D1 `DB` binding and migrations configuration in `wrangler.jsonc`
- [ ] T002 Create booking tables, unique confirmed-slot constraint, conversation key, and processed-message key in `migrations/0001_booking_journey.sql`
- [ ] T003 Run `npm run cf-typegen` and update generated binding types in `worker-configuration.d.ts`

## Phase 2: Foundational

- [ ] T004 Create conversation input, response, state, booking, and repository contracts in `src/conversation/types.ts` and `src/persistence/conversation-repository.ts`
- [ ] T005 [P] Create failing journey and duplicate-action tests in `tests/unit/conversation-engine.test.ts`
- [ ] T006 [P] Create failing availability, conflict, cancellation, and reschedule tests in `tests/unit/availability.test.ts`
- [ ] T007 Implement a D1 repository with parameterized statements, transaction-based confirmation, and message idempotency in `src/persistence/d1-conversation-repository.ts`
- [ ] T008 Extend `src/barbershop/config.ts` with stable service IDs, duration, professional, slot policy, and America/Sao_Paulo schedule

## Phase 3: User Story 1 - Agendar atendimento (P1) 🎯 MVP

**Goal**: concluir e persistir uma reserva sem dupla ocupação.

- [ ] T009 [US1] Implement slot generation and confirmed-booking conflict handling in `src/conversation/availability.ts`
- [ ] T010 [US1] Implement service, date, time, review, confirm, and resume transitions in `src/conversation/engine.ts`
- [ ] T011 [US1] After completing `specs/001-harden-webhook/tasks.md`, connect authenticated inbound messages to the engine and D1 repository in `src/index.ts`
- [ ] T012 [US1] Run `npm test` and validate the confirmation race described in `specs/002-booking-journey/quickstart.md`

## Phase 4: User Story 2 - Respostas interativas (P1)

**Goal**: oferecer decisões como botões/listas e tratar IDs de resposta.

- [ ] T013 [US2] Extend webhook extraction for interactive button and list reply IDs in `src/whatsapp/types.ts`
- [ ] T014 [US2] Add text, button, and list rendering to the WhatsApp adapter in `src/whatsapp/client.ts`
- [ ] T015 [US2] Map domain response contracts to WhatsApp renderer calls in `src/index.ts`
- [ ] T016 [US2] Add interactive-ID routing tests in `tests/unit/conversation-engine.test.ts`

## Phase 5: User Story 3 - Handoff e gestão da reserva (P2)

**Goal**: permitir humano, cancelamento e remarcação sem perder a reserva.

- [ ] T017 [US3] Implement human-mode, cancellation, and reschedule transitions in `src/conversation/engine.ts`
- [ ] T018 [US3] Implement release and replacement of confirmed slots in `src/persistence/d1-conversation-repository.ts`
- [ ] T019 [US3] Add handoff, cancellation, and reschedule coverage in `tests/unit/conversation-engine.test.ts`

## Final Phase: Validation and Security

- [ ] T020 Replace production logging of customer content and identifiers with safe operational events in `src/index.ts` and `src/whatsapp/client.ts`
- [ ] T021 Run local migrations, `npm run cf-typegen`, `npm test`, and `git diff --check`; record results in `specs/002-booking-journey/quickstart.md`
- [ ] T022 Verify every requirement in `specs/002-booking-journey/spec.md`; stop before any remote migration or `wrangler deploy` and request explicit approval

## Dependencies & Execution Order

```text
001 hardening → T001–T003 → T004–T008 → US1 (T009–T012) → US2 (T013–T016) → US3 (T017–T019) → T020–T022
```

- T005 and T006 are parallel and must fail before T009/T010.
- US2 follows US1 because the same engine response contract is rendered by the
  WhatsApp adapter.
- US3 follows US1 because it operates on confirmed reservations.

## Implementation Strategy

1. Provision only local schema/configuration and pure contracts.
2. Build and test the booking state machine before the webhook integration.
3. Add native WhatsApp rendering and interactive ID parsing.
4. Add handoff and reservation changes, then validate locally.
5. Do not apply remote migrations or deploy without explicit approval.
