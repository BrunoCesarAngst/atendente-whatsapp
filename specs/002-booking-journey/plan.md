# Implementation Plan: Jornada de Agendamento

**Branch**: `002-booking-journey` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Evoluir o atendente determinístico para uma jornada persistida de agendamento:
texto livre inicia intenções conhecidas; botões e listas conduzem decisões; D1
armazena conversas e reservas; o domínio decide a próxima ação e o adaptador
WhatsApp renderiza texto ou componentes interativos.

## Technical Context

**Language/Version**: TypeScript ESNext, Node.js 22.21.1 para testes

**Primary Dependencies**: Hono, Wrangler e APIs Cloudflare/WhatsApp já existentes

**Storage**: Cloudflare D1, uma base por ambiente e binding `DB`

**Testing**: `node --experimental-strip-types --test`; testes unitários para
jornada e disponibilidade, com repositório em memória; migrações verificadas
localmente via Wrangler antes de publicação

**Target Platform**: Cloudflare Workers + WhatsApp Cloud API

**Project Type**: serviço webhook com domínio de conversação persistido

**Performance Goals**: reconhecer e confirmar o webhook imediatamente; operações
de conversa/reserva concluem antes da renderização da próxima resposta

**Constraints**:

- D1 é o único armazenamento novo; não usar Queue, Durable Objects, LLM, Flows,
  calendário externo ou dependências npm.
- Implementar o hardening de assinatura definido em `specs/001-harden-webhook/`
  antes de conectar a jornada persistida ao webhook de produção.
- Criar reserva em transação e impor unicidade de empresa/profissional/início para
  impedir dupla confirmação.
- Preservar o fluxo real de entrada/saída WhatsApp e manter configuração da
  barbearia fora de adaptadores e repositórios.
- Não registrar mensagem, telefone, identificador externo ou dados de reserva em
  logs de produção.
- Não fazer deploy sem pedido explícito do proprietário.

**Scale/Scope**: uma empresa e profissional configurados; jornadas de agendar,
cancelar, remarcar e handoff; sem pagamentos ou multi-tenant operacional

## Constitution Check

A constituição contém placeholders. Gates aplicáveis:

- PASS — configuração, domínio, persistência e WhatsApp terão fronteiras próprias.
- PASS — D1 é necessário para retomar conversa e confirmar horário atomicamente.
- PASS — não há nova dependência npm nem deploy automático.
- PASS — testes precedem a integração do webhook.

### Re-check after Phase 1 design

O modelo usa uma restrição única e transação D1 para o horário; a representação de
resposta não depende do adaptador WhatsApp. Gates permanecem aprovados.

## Project Structure

```text
src/
├── barbershop/config.ts
├── conversation/
│   ├── engine.ts
│   ├── types.ts
│   └── availability.ts
├── persistence/
│   ├── conversation-repository.ts
│   └── d1-conversation-repository.ts
├── whatsapp/
│   ├── client.ts
│   └── types.ts
└── index.ts

migrations/
└── 0001_booking_journey.sql

tests/unit/
├── conversation-engine.test.ts
└── availability.test.ts
```

**Structure Decision**: `conversation/` é o domínio puro; `persistence/` traduz
seu contrato para D1; `whatsapp/` extrai e renderiza protocolos externos.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Persistência D1 | Retomar jornadas e confirmar horários sem duplicidade | Estado em memória se perde entre webhooks e instâncias |
