# Feature Specification: Motor de Jornadas Conversacionais

**Feature Branch**: `003-conversation-journey-engine`
**Created**: 2026-10-07
**Status**: Draft
**Input**: Evoluir o atendimento existente no WhatsApp para um motor de jornadas
conversacionais, preservando o webhook e usando linguagem natural e escolhas
estruturadas para concluir atendimentos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar e concluir um agendamento (Priority: P1)

Como cliente de uma barbearia, quero iniciar uma conversa, escolher ou informar
o serviço e horário, e confirmar meu agendamento para receber uma confirmação
clara sem repetir informações.

**Why this priority**: Agendamento é a principal conclusão de valor da primeira
versão e exige estado, disponibilidade e regras confiáveis.

**Independent Test**: Uma conversa nova percorre saudação, serviço, data,
horário e confirmação, persistindo uma única reserva no horário escolhido.

**Acceptance Scenarios**:

1. **Given** uma conversa nova, **When** o cliente envia uma saudação, **Then**
   recebe uma mensagem de boas-vindas com escolhas para agendar, ver serviços ou
   falar com uma pessoa.
2. **Given** uma conversa de agendamento, **When** o cliente escolhe serviço,
   data, horário e confirmação, **Then** recebe o resumo e uma reserva confirmada.
3. **Given** dois clientes tentando confirmar o mesmo horário, **When** as duas
   confirmações chegam, **Then** no máximo uma reserva é confirmada e a outra
   pessoa é direcionada a outro horário.

---

### User Story 2 - Conversar livremente e receber ajuda estruturada (Priority: P1)

Como cliente, quero escrever naturalmente quando sei o que preciso e receber
botões ou listas somente quando preciso decidir entre alternativas.

**Why this priority**: A conversa deve reduzir etapas para pedidos claros sem
perder a previsibilidade de decisões críticas.

**Independent Test**: Um pedido de preço recebe resposta direta; um pedido de
agendamento com serviço e período conhecidos avança para horários compatíveis;
uma resposta interativa avança pelo identificador estável recebido.

**Acceptance Scenarios**:

1. **Given** o pedido “quanto custa o corte?”, **When** é recebido, **Then** o
   cliente recebe o preço sem navegar pelo menu inicial.
2. **Given** o pedido “quero cortar amanhã depois das cinco”, **When** as
   informações forem reconhecidas com segurança, **Then** o cliente recebe apenas
   horários disponíveis compatíveis.
3. **Given** uma escolha apresentada, **When** o cliente toca um botão ou item de
   lista, **Then** a jornada usa o identificador estável da escolha, não o rótulo.

---

### User Story 3 - Pausar automação para atendimento humano (Priority: P2)

Como cliente, quero pedir atendimento humano para que a automação não continue
respondendo enquanto uma pessoa assume a conversa.

**Why this priority**: Handoff evita que a automação seja uma barreira para uma
necessidade não coberta pela jornada.

**Independent Test**: Ao pedir uma pessoa, a conversa muda para modo humano,
registra o pedido e deixa de produzir respostas automáticas até retomada explícita.

**Acceptance Scenarios**:

1. **Given** qualquer etapa automática, **When** o cliente pede uma pessoa,
   **Then** recebe confirmação de encaminhamento e o modo humano é persistido.
2. **Given** uma conversa em modo humano, **When** chega nova mensagem, **Then**
   não é enviada resposta automática.

---

### User Story 4 - Gerenciar uma reserva (Priority: P2)

Como cliente, quero cancelar ou remarcar uma reserva confirmada para manter meu
horário atualizado.

**Why this priority**: O ciclo de atendimento só termina corretamente se a
reserva puder ser alterada de forma segura.

**Independent Test**: Uma reserva confirmada pode ser cancelada ou transferida a
outro horário, liberando o horário anterior sem criar reserva duplicada.

### Edge Cases

- A Meta reenvia o mesmo evento ou uma escolha antiga chega fora da etapa atual.
- O webhook não é autenticado, tem corpo inválido ou a assinatura não confere.
- A interpretação de texto é ambígua, de baixa confiança ou inválida.
- Um horário deixa de estar disponível entre a apresentação e a confirmação.
- Não há provedor de IA, Flow ou canal de notificação humana configurado.
- O cliente retorna depois de interromper uma jornada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE preservar o contrato de webhook existente para
  eventos autenticados: confirmação imediata e processamento assíncrono.
- **FR-002**: O sistema DEVE autenticar cada evento recebido antes de interpretar
  seu conteúdo e não pode registrar segredos, payload integral, telefone completo
  ou texto de cliente em produção.
- **FR-003**: O sistema DEVE identificar e ignorar reentregas pelo identificador
  de mensagem sem duplicar transições, reservas ou notificações.
- **FR-004**: O domínio DEVE produzir um modelo de resposta independente do canal
  para texto, botões, listas e Flows opcionais.
- **FR-005**: O adaptador WhatsApp DEVE enviar texto, botões de resposta e listas
  e interpretar as respectivas escolhas recebidas por seus IDs estáveis.
- **FR-006**: O sistema DEVE manter estado por negócio e cliente, incluindo
  jornada, etapa, modo, contexto e datas de atualização.
- **FR-007**: A primeira configuração de negócio DEVE representar uma barbearia
  configurável com serviços, preço, duração, horários, fuso e responsável.
- **FR-008**: A jornada de agendamento DEVE oferecer seleção e confirmação de
  serviço, data e horário e não pode confirmar duas reservas no mesmo horário.
- **FR-009**: O sistema DEVE permitir cancelamento, remarcação e handoff humano.
- **FR-010**: A interpretação opcional de linguagem DEVE retornar intenção e
  entidades validadas; nenhuma interpretação pode executar ações ou alterar
  estado sem regras determinísticas.
- **FR-011**: Quando a interpretação não estiver disponível, for ambígua, tiver
  baixa confiança ou falhar validação, o sistema DEVE usar fallback determinístico
  e oferecer uma próxima decisão adequada.
- **FR-012**: Flows e templates devem ser abstrações opcionais; ausência de sua
  configuração não pode impedir a jornada baseada em botões e listas.
- **FR-013**: O sistema DEVE persistir somente os dados necessários para atender,
  agendar, deduplicar e encaminhar, minimizando identificadores pessoais.
- **FR-014**: Nenhuma IA pode fazer deploy, publicar configuração, alterar
  segredos, executar migração remota ou enviar comunicação proativa sem pedido
  explícito do proprietário.

### Key Entities

- **Negócio**: configuração e capacidades de um prestador de serviço.
- **Cliente**: identidade minimizada de uma pessoa em um negócio.
- **Conversa**: estado persistido de jornada, etapa, modo e contexto.
- **Mensagem processada**: registro que evita reprocessar uma entrega da Meta.
- **Reserva**: compromisso confirmado, cancelado ou remarcado para um serviço.
- **Handoff**: solicitação e ciclo de encaminhamento a uma pessoa.
- **Resposta de conversa**: instrução de apresentação independente do WhatsApp.
- **Interpretação de intenção**: sugestão validada de intenção e entidades, sem
  autoridade para operar o negócio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um cliente consegue concluir um agendamento em até cinco decisões
  quando inicia sem dados prévios.
- **SC-002**: Pedidos que já contêm serviço e período chegam à lista compatível de
  horários sem exigir escolhas já informadas.
- **SC-003**: Em confirmações concorrentes do mesmo horário, 100% dos cenários de
  teste resultam em no máximo uma reserva confirmada.
- **SC-004**: 100% dos eventos duplicados de teste não criam uma segunda transição
  de conversa, reserva ou handoff.
- **SC-005**: Em modo humano, 100% das mensagens de teste não recebem resposta
  automática até retomada explícita.
- **SC-006**: Nenhum cenário de log de produção coberto pelos testes inclui segredo,
  payload integral, telefone completo ou conteúdo integral da conversa.

## Assumptions

- A primeira versão atende uma única barbearia e um profissional por horário,
  preservando um modelo que suporte múltiplos negócios no futuro.
- O fuso inicial é `America/Sao_Paulo` e serviços/horários são demonstrações
  configuráveis.
- D1 é a persistência inicial por suportar consistência de reserva sem introduzir
  um serviço novo.
- IA e Flows entram após a jornada determinística; ambos permanecem opcionais.
- A comunicação inicial acontece dentro da janela de atendimento; mensagens
  iniciadas pelo negócio serão tratadas por uma abstração de templates posterior.
