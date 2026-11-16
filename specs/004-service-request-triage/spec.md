# Especificação: triagem configurável de serviços

**Feature Branch**: `004-service-request-triage`

**Created**: 2026-11-16

**Status**: Draft

**Objetivo**: validar localmente um atendente reutilizável para uma barbearia,
limpeza de piscina e jardinagem, sem depender da Meta, de painel administrativo
ou de comunicação proativa com profissionais.

## Cenários e testes

### História 1 — Agendar um serviço de horário fixo (P1)

Como cliente de uma barbearia, quero escolher serviço, data e horário para
receber a confirmação de uma reserva sem depender de uma pessoa.

**Teste independente**: uma conversa passa por serviço, data, horário e
confirmação, criando uma única reserva mesmo com reentrega do evento.

### História 2 — Solicitar limpeza de piscina (P1)

Como cliente, quero informar o tipo de limpeza, frequência, bairro e período
preferido para que o profissional possa avaliar o pedido sem o atendimento
inventar preço ou disponibilidade.

**Teste independente**: uma conversa termina com uma solicitação pendente,
assume modo humano e não cria reserva automática.

### História 3 — Solicitar jardinagem (P1)

Como cliente, quero informar o serviço, bairro, porte aproximado da área e
período preferido para que o profissional possa avaliar visita ou orçamento.

**Teste independente**: uma conversa termina com uma solicitação pendente e os
dados coletados correspondem às escolhas feitas pelo cliente.

### História 4 — Proteger a transição para atendimento humano (P2)

Como profissional, quero que uma solicitação concluída pare a automação para
evitar respostas conflitantes enquanto avalio o pedido.

**Teste independente**: uma mensagem posterior à solicitação não recebe resposta
automática até retomada explícita.

## Casos de borda

- A Meta reentrega o mesmo evento após a solicitação já ter sido registrada.
- Uma resposta antiga ou fora da etapa atual chega ao Worker.
- O cliente envia texto vazio para um campo de localização.
- Um perfil de negócio desconhecido é selecionado.
- O cliente pede preço ou horário em um serviço que exige avaliação humana.

## Requisitos funcionais

- **FR-001**: o sistema DEVE suportar perfil de negócio de agenda automática e
  perfil de triagem de solicitação.
- **FR-002**: a barbearia DEVE manter o fluxo atual de reserva e a proteção
  contra horários duplicados.
- **FR-003**: piscina e jardinagem DEVEM coletar somente informações necessárias
  para avaliação inicial, sem prometer preço, visita ou horário final.
- **FR-004**: uma solicitação concluída DEVE ser persistida com negócio, cliente,
  serviço, respostas coletadas, status pendente e data de criação.
- **FR-005**: após persistir a solicitação, a conversa DEVE ficar em modo humano.
- **FR-006**: perfis e perguntas DEVEM ficar fora do adaptador WhatsApp e poder
  ser trocados sem alterar o motor de conversa.
- **FR-007**: mensagens duplicadas NÃO DEVEM criar segunda solicitação nem
  segunda resposta.
- **FR-008**: logs de produção NÃO DEVEM registrar bairro, endereço, texto de
  cliente, telefone ou conteúdo completo da solicitação.
- **FR-009**: o comportamento local DEVE ser validado por testes unitários,
  integração de webhook e smoke test com D1 e Cloud API simulados.

## Entidades principais

- **Perfil de negócio**: configuração administrada por um operador, com modo de
  atendimento, serviços e perguntas de triagem.
- **Solicitação de serviço**: pedido pendente de avaliação humana, ligado a um
  negócio, cliente e serviço.
- **Campo de triagem**: informação solicitada ao cliente, por texto livre ou
  escolha estruturada.

## Critérios de sucesso

- **SC-001**: os três roteiros locais são concluídos sem alterar o motor de
  conversa para trocar de negócio.
- **SC-002**: 100% das reentregas cobertas por teste produzem no máximo uma
  reserva ou uma solicitação.
- **SC-003**: pedidos de piscina e jardinagem nunca retornam preço ou horário
  definitivo automaticamente.
- **SC-004**: o profissional encontra uma solicitação local persistida com todas
  as respostas esperadas.

## Premissas e limites

- Cada contratação começa com um perfil configurado por Bruno; autoatendimento
  administrativo e painel ficam fora desta etapa.
- O primeiro contato de piscina e jardinagem coleta bairro, não endereço
  completo; o profissional combina detalhes posteriormente.
- Notificação proativa, orçamento final, foto e pagamento ficam fora desta etapa.
- Um Worker seleciona um perfil por configuração de ambiente para validar o
  comportamento; múltiplos negócios no mesmo número ficam para evolução futura.
