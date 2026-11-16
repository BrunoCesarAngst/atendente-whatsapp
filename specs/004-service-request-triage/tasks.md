# Tarefas: triagem configurável de serviços

## Fundação

- [x] T001 Criar testes de perfil de negócio e seleção de jornada.
- [x] T002 Criar contrato configurável para agenda e triagem em `src/businesses/`.
- [x] T003 Criar migration de solicitações e métodos de repositório D1/memória.
- [x] T004 Atualizar decisão de arquitetura sobre triagem sem notificação externa.

## História 1 — Barbeiro (P1)

- [x] T005 Criar regressão que preserve o agendamento e a deduplicação atuais.
- [x] T006 Selecionar perfil de agenda pelo ambiente, mantendo a barbearia como padrão.

## História 2 — Piscina (P1)

- [x] T007 Criar teste unitário do roteiro de limpeza de piscina.
- [x] T008 Implementar motor de triagem e persistência de solicitação pendente.
- [x] T009 Criar teste de integração do webhook para piscina.

## História 3 — Jardinagem (P1)

- [x] T010 Criar teste unitário do roteiro de jardinagem.
- [x] T011 Criar perfil e validar respostas específicas sem alterar o motor.
- [x] T012 Estender smoke test local e inspeção D1 para solicitações.

## Validação

- [x] T013 Executar typecheck, testes, migrations locais, smoke tests e revisão de logs.
- [x] T014 Atualizar documentação de validação local e registrar resultados.
- [ ] T015 Parar antes de qualquer deploy, migração remota, secret ou configuração Meta.
