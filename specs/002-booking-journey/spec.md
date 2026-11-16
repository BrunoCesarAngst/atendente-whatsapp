# Feature Specification: Jornada de Agendamento

**Feature Branch**: `002-booking-journey`
**Created**: 2026-10-07
**Status**: Draft
**Input**: User description: "Autorizar persistência para uma jornada real de agendamento no WhatsApp, evoluindo o atendente determinístico para conversa guiada com escolhas nativas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agendar um atendimento pelo WhatsApp (Priority: P1)

Como cliente da barbearia, quero escolher serviço, dia e horário dentro do
WhatsApp para receber uma confirmação clara do meu agendamento.

**Why this priority**: O agendamento é a principal conclusão útil da conversa e
transforma o atendimento em operação real.

**Independent Test**: Um cliente inicia a jornada, seleciona um serviço, escolhe
data e horário disponíveis, confirma e recebe um resumo persistido do agendamento.

**Acceptance Scenarios**:

1. **Given** uma conversa nova, **When** o cliente escolhe “Agendar horário”,
   **Then** recebe escolhas estruturadas de serviços disponíveis.
2. **Given** um serviço escolhido, **When** o cliente escolhe dia e horário,
   **Then** recebe uma confirmação com serviço, data, horário e preço.
3. **Given** uma confirmação, **When** o cliente confirma a reserva,
   **Then** o agendamento é salvo e o horário deixa de ser oferecido a outro
   cliente.
4. **Given** uma conversa interrompida, **When** o cliente retorna antes de
   concluir, **Then** a jornada retoma da próxima informação pendente.

---

### User Story 2 - Usar escolhas rápidas sem perder a conversa livre (Priority: P1)

Como cliente, quero usar botões e listas quando preciso decidir, mas também poder
escrever naturalmente quando minha intenção já estiver clara.

**Why this priority**: Escolhas estruturadas tornam decisões rápidas e IDs
confiáveis, enquanto texto livre evita navegação artificial.

**Independent Test**: O cliente pode entrar pela saudação ou por mensagem de
agendamento e avançar pelos mesmos passos usando respostas interativas válidas.

**Acceptance Scenarios**:

1. **Given** uma intenção de agendar reconhecida, **When** a próxima decisão tiver
   poucas alternativas, **Then** o cliente recebe botões nativos.
2. **Given** uma escolha entre vários serviços ou horários, **When** a lista for
   mais apropriada, **Then** o cliente recebe lista nativa com identificadores
   estáveis.
3. **Given** uma resposta interativa recebida, **When** seu identificador
   corresponde ao passo atual, **Then** a jornada avança sem depender do texto do
   rótulo.

---

### User Story 3 - Solicitar atendimento humano e gerenciar reserva (Priority: P2)

Como cliente, quero pedir atendimento humano, remarcar ou cancelar uma reserva
confirmada para não ficar preso ao atendimento automático.

**Why this priority**: Exceções e preferência por contato humano precisam de uma
saída segura e previsível.

**Independent Test**: O cliente solicita atendimento humano, ou seleciona
remarcação/cancelamento de uma reserva confirmada, e a conversa/agenda reflete a
decisão persistida.

**Acceptance Scenarios**:

1. **Given** qualquer ponto da jornada, **When** o cliente escolhe “Falar com
   alguém”, **Then** o atendimento automático é suspenso e a conversa é marcada
   para humano.
2. **Given** uma reserva confirmada, **When** o cliente cancela, **Then** a reserva
   é cancelada e o horário volta a ficar disponível.
3. **Given** uma reserva confirmada, **When** o cliente pede remarcação, **Then** a
   jornada retorna à escolha de novo horário preservando o serviço.

### Edge Cases

- Dois clientes tentam confirmar o mesmo horário simultaneamente.
- Um botão antigo é tocado depois de a jornada ter mudado ou expirado.
- O cliente envia texto não reconhecido no meio da seleção estruturada.
- Um horário escolhido já não está disponível no momento da confirmação.
- O cliente volta a escrever depois de pedir atendimento humano.
- Uma mensagem duplicada é entregue pelo provedor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE manter uma conversa persistida por cliente e empresa,
  incluindo jornada ativa, etapa atual, dados coletados e modo de atendimento.
- **FR-002**: O sistema DEVE oferecer jornada de agendamento com as etapas
  serviço, dia, horário, revisão e confirmação.
- **FR-003**: O sistema DEVE responder decisões apropriadas com componentes
  interativos nativos e interpretar respostas pelos seus identificadores estáveis.
- **FR-004**: O sistema DEVE continuar aceitando mensagens de texto e reconhecer
  ao menos saudação, pedido de agendamento, serviços, preços, horários e pedido de
  atendimento humano.
- **FR-005**: O sistema DEVE persistir uma reserva confirmada com cliente,
  serviço, início, preço acordado, situação e datas de criação/atualização.
- **FR-006**: O sistema DEVE impedir que duas reservas confirmadas ocupem o mesmo
  horário da mesma empresa.
- **FR-007**: O sistema DEVE apresentar somente horários disponíveis de acordo com
  a configuração do estabelecimento e as reservas confirmadas.
- **FR-008**: O sistema DEVE permitir cancelamento e remarcação de reservas
  confirmadas pelo próprio cliente.
- **FR-009**: O sistema DEVE permitir handoff humano em qualquer etapa e suspender
  respostas automáticas até que o atendimento seja devolvido ao modo automático.
- **FR-010**: A configuração do estabelecimento DEVE permanecer separada dos
  adaptadores de WhatsApp e do armazenamento.
- **FR-011**: O sistema DEVE tratar entregas duplicadas sem criar duas reservas ou
  avançar uma jornada duas vezes.
- **FR-012**: O sistema NÃO DEVE usar LLM, IA generativa, banco externo ao escopo
  de persistência aprovado, WhatsApp Flows, mídia, templates proativos ou
  integração com agenda externa nesta primeira jornada.
- **FR-013**: O sistema DEVE preservar o recebimento e envio de mensagens reais
  pelo fluxo de webhook existente.
- **FR-014**: Dados de clientes persistidos DEVEM ser minimizados ao necessário
  para atendimento e não podem aparecer integralmente em logs de produção.

### Key Entities

- **Conversa**: estado do atendimento de um cliente para uma empresa, incluindo
  jornada, etapa, modo automático ou humano e contexto coletado.
- **Reserva**: compromisso de um cliente para um serviço, em data/hora específica,
  com preço e situação.
- **Horário disponível**: opção derivada da configuração de funcionamento e das
  reservas confirmadas.
- **Ação de jornada**: decisão estruturada ou texto interpretado que move a
  conversa a uma próxima etapa.
- **Estabelecimento**: configuração de serviços, preços, duração, funcionamento e
  políticas usada pela jornada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um cliente conclui um agendamento em no máximo cinco decisões após
  iniciar a jornada.
- **SC-002**: 100% das confirmações concorrentes para o mesmo horário resultam em,
  no máximo, uma reserva confirmada.
- **SC-003**: 100% das respostas interativas válidas são processadas por seu
  identificador, sem depender do texto apresentado ao cliente.
- **SC-004**: Um cliente que retorna a uma jornada incompleta recebe a próxima ação
  pendente sem repetir informações já coletadas.
- **SC-005**: Cancelamentos liberam o respectivo horário para uma nova reserva e
  remarcações preservam o serviço escolhido.
- **SC-006**: O handoff humano interrompe 100% das respostas automáticas até o
  retorno explícito ao modo automático.

## Assumptions

- A primeira versão atende uma única barbearia configurada e um profissional por
  horário; a modelagem deve permitir múltiplas empresas futuramente.
- Serviços, preços, duração e horários configurados são fictícios no ambiente de
  demonstração e poderão ser substituídos sem mudar o adaptador WhatsApp.
- O fuso do estabelecimento é America/Sao_Paulo.
- A disponibilidade é calculada internamente; agenda externa e pagamentos estão
  fora de escopo.
- A escolha do mecanismo de persistência será definida no plano com prioridade
  para confirmação atômica de um horário e baixa complexidade operacional.
