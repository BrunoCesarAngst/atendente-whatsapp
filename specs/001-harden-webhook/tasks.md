# Tasks: Hardening do Webhook

**Input**: Design documents from `/specs/001-harden-webhook/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/webhook.md`, `quickstart.md`

**Tests**: Testes unitários são obrigatórios por FR-008 e FR-009. Criá-los antes
da implementação correspondente e confirmar a falha inicial do teste de assinatura.

**Organization**: Tarefas agrupadas por história para permitir validação
independente.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: habilitar a execução de testes sem instalar dependências e sincronizar
os tipos de bindings.

- [ ] T001 Add the native Node TypeScript test command to `package.json` using `node --experimental-strip-types --test tests/unit/*.test.ts`
- [ ] T002 Run `npm run cf-typegen` and add the generated `worker-configuration.d.ts` to the repository without any secret values

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: estabelecer o contrato seguro de ambiente e os helpers puros antes de
alterar a rota HTTP.

- [ ] T003 Update `src/env.ts` to compose generated `CloudflareBindings` with manually named secret bindings, including `WHATSAPP_APP_SECRET`, without duplicating public Wrangler vars
- [ ] T004 [P] Create parsing regression tests for complete text messages, non-text events, and incomplete fields in `tests/unit/whatsapp-types.test.ts`
- [ ] T005 [P] Create failing signature tests for matching raw body, missing header, malformed prefix or hex, mismatched body, and invalid digest in `tests/unit/whatsapp-signature.test.ts`

**Checkpoint**: the parser regression tests pass and the signature suite fails only
because the verifier is not implemented.

---

## Phase 3: User Story 1 - Aceitar somente eventos autênticos (Priority: P1) 🎯 MVP

**Goal**: autenticar todos os `POST /webhook` antes de parsing ou resposta, sem
alterar o fluxo de eventos válidos.

**Independent Test**: uma assinatura HMAC SHA-256 válida sobre os mesmos bytes
retorna válida; cabeçalho ausente, malformado, corpo alterado ou digest errado é
rejeitado; uma requisição autenticada continua retornando `EVENT_RECEIVED`.

- [ ] T006 [US1] Implement raw-byte HMAC SHA-256 header parsing and constant-time equal-length comparison in `src/whatsapp/signature.ts`
- [ ] T007 [US1] Update `src/index.ts` to read raw request bytes once, validate `X-Hub-Signature-256` with `WHATSAPP_APP_SECRET`, return generic `401` before JSON parsing on rejection, and preserve `400 BAD_REQUEST` for authenticated malformed JSON
- [ ] T008 [US1] Run `npm test` and validate the accepted and rejected `POST /webhook` cases against `specs/001-harden-webhook/contracts/webhook.md`

**Checkpoint**: somente eventos autenticados chegam ao parser; eventos válidos
mantêm a confirmação atual e o processamento em segundo plano.

---

## Phase 4: User Story 2 - Diagnosticar sem expor dados pessoais (Priority: P1)

**Goal**: substituir logs de payload e mensagem por eventos operacionais seguros.

**Independent Test**: revisar cada caminho de log de produção e confirmar que ele
distingue assinatura rejeitada, JSON inválido, evento sem texto e falha de envio sem
conter payload, mensagem, telefone, ID externo, token ou cabeçalho de autorização.

- [ ] T009 [US2] Replace payload and message-content logs with safe event categories in `src/index.ts`
- [ ] T010 [US2] Replace response-body logging and unsafe error interpolation with safe outcome logging in `src/whatsapp/client.ts`
- [ ] T011 [US2] Audit the production log statements in `src/index.ts` and `src/whatsapp/client.ts` against FR-006 and FR-007, recording only the result in `specs/001-harden-webhook/quickstart.md`

**Checkpoint**: logs permanecem operacionais sem conter dados pessoais ou segredos.

---

## Phase 5: User Story 3 - Alterar o hardening com segurança (Priority: P2)

**Goal**: manter uma suíte de regressão repetível para parsing e verificação.

**Independent Test**: `npm test` executa os dois arquivos de teste, sem rede,
tokens reais ou runtime Cloudflare emulado.

- [ ] T012 [US3] Complete test assertions for successful and rejected HMAC verification in `tests/unit/whatsapp-signature.test.ts`
- [ ] T013 [US3] Confirm existing extraction behavior remains covered in `tests/unit/whatsapp-types.test.ts`
- [ ] T014 [US3] Run `npm run cf-typegen` and `npm test`, then update expected commands and outcomes in `specs/001-harden-webhook/quickstart.md`

**Checkpoint**: as regras puras de parsing e assinatura são cobertas sem novas
dependências.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T015 Review `src/env.ts`, `src/index.ts`, `src/whatsapp/signature.ts`, and `worker-configuration.d.ts` for accidental secret values or duplicated public binding types
- [ ] T016 Run `git diff --check` and all quickstart validation commands; document failures, if any, in `specs/001-harden-webhook/quickstart.md`
- [ ] T017 Verify the completed implementation against FR-001 through FR-012 and SC-001 through SC-005 in `specs/001-harden-webhook/spec.md`
- [ ] T018 Stop before `npm run deploy` or `wrangler deploy`; request the owner's explicit deployment authorization after review

## Dependencies & Execution Order

```text
T001, T002
  └─ T003, T004, T005
       └─ US1: T006 → T007 → T008
       └─ US2: T009 → T010 → T011
       └─ US3: T012 → T013 → T014
            └─ T015 → T016 → T017 → T018
```

- US1 depends on the shared signature contract and test command.
- US2 can begin after the shared contract, but is validated after the routing
  change so every production log path is reviewed.
- US3 starts with the test tasks in Phase 2 and completes after the implementation
  makes the signature assertions pass.

## Parallel Opportunities

- T004 and T005 edit different test files and can run in parallel.
- After T003–T005, T006 and the log-audit preparation for T009 can be reviewed in
  parallel, but `src/index.ts` edits T007 and T009 must be sequential.
- T012 and T013 can be reviewed in parallel because they affect distinct tests.

## Implementation Strategy

1. Establish scripts and generated binding types without adding a dependency.
2. Write parsing and signature tests; see signature tests fail.
3. Implement the pure verifier and wire it into the webhook while preserving the
   valid-event path.
4. Replace unsafe logs with safe categories and rerun the full suite.
5. Review all tasks and validation results. Do not deploy automatically.
