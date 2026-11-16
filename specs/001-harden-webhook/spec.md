# Feature Specification: Hardening do Webhook

**Feature Branch**: `001-harden-webhook`
**Created**: 2026-10-07
**Status**: Draft
**Input**: User description: "Hardening mínimo do webhook atual, sem mudar o comportamento funcional: validar assinatura da Meta, reduzir exposição de dados em logs, manter diagnóstico útil, adicionar testes de parsing e verificação, e aproveitar tipos gerados quando aplicável."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aceitar somente eventos autênticos (Priority: P1)

Como proprietário do atendimento, quero que o webhook processe apenas eventos cuja
autenticidade possa ser confirmada pelo cabeçalho `X-Hub-Signature-256`, para
impedir que terceiros enviem mensagens em nome da Meta.

**Why this priority**: Aceitar eventos forjados pode produzir respostas indevidas
para clientes e expor o fluxo de atendimento a abuso.

**Independent Test**: Pode ser verificado enviando um evento válido com sua
assinatura correspondente e eventos idênticos com assinatura ausente, inválida ou
associada a conteúdo diferente.

**Acceptance Scenarios**:

1. **Given** um evento da Meta com corpo inalterado e `X-Hub-Signature-256`
   válido, calculado com o App Secret, **When** ele chega ao webhook, **Then** o
   fluxo existente de confirmação e processamento é preservado.
2. **Given** um evento sem assinatura válida, **When** ele chega ao webhook,
   **Then** ele é rejeitado antes de seu conteúdo ser processado ou responder a
   qualquer mensagem.
3. **Given** uma assinatura válida para um corpo diferente, **When** o corpo
   recebido não corresponde ao que foi assinado, **Then** o evento é rejeitado.

---

### User Story 2 - Diagnosticar o webhook sem expor dados pessoais (Priority: P1)

Como pessoa responsável pela operação, quero logs suficientes para investigar
sucessos e falhas do webhook sem que conteúdo de mensagens, telefones, tokens ou
payloads completos sejam expostos em produção.

**Why this priority**: O diagnóstico é necessário para operar a integração, mas
dados de clientes e credenciais não devem ser divulgados em registros de produção.

**Independent Test**: Pode ser verificado disparando eventos válidos e inválidos e
checando que os registros indicam resultado, categoria e identificadores seguros,
sem incluir o corpo integral ou dados pessoais.

**Acceptance Scenarios**:

1. **Given** um evento válido recebido, **When** o processamento é registrado,
   **Then** o registro permite identificar o resultado e a categoria do evento sem
   incluir texto da mensagem, número de telefone ou payload completo.
2. **Given** uma falha de validação ou de envio, **When** ela é registrada,
   **Then** o registro contém contexto operacional suficiente para diagnóstico sem
   incluir segredos, cabeçalhos de autorização, corpo completo ou dados pessoais.

---

### User Story 3 - Alterar o hardening com segurança (Priority: P2)

Como pessoa mantenedora, quero testes unitários para as regras de parsing e
verificação, para alterar a integração com confiança sem mudar o comportamento
funcional esperado.

**Why this priority**: O webhook depende de entradas externas e regras de
segurança sensíveis a regressões.

**Independent Test**: Pode ser verificado executando a suíte de testes contra
payloads de texto, eventos sem texto, JSON inválido e combinações de assinatura
válida e inválida.

**Acceptance Scenarios**:

1. **Given** um conjunto de eventos representativos, **When** os testes de
   parsing são executados, **Then** somente mensagens de texto completas são
   extraídas, como no comportamento atual.
2. **Given** assinaturas válidas, ausentes, malformadas e inválidas, **When** os
   testes de verificação são executados, **Then** somente a assinatura válida para
   o corpo recebido é aceita.

### Edge Cases

- O evento chega sem o cabeçalho de assinatura ou com formato inesperado.
- O corpo recebido é vazio, não é JSON válido ou é alterado após a assinatura.
- O segredo da aplicação não está disponível no ambiente de execução.
- O evento possui estrutura válida, mas não contém uma mensagem de texto completa.
- A integração externa retorna erro após o evento já ter sido confirmado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE verificar o cabeçalho `X-Hub-Signature-256` de cada
  evento recebido antes de analisar ou processar seu conteúdo, usando o App Secret
  da Meta fornecido exclusivamente pelo ambiente seguro.
- **FR-002**: O sistema DEVE aceitar um evento somente quando
  `X-Hub-Signature-256` estiver presente, usar o prefixo `sha256=`, contiver uma
  assinatura hexadecimal SHA-256 válida e corresponder exatamente aos bytes do
  corpo recebido.
- **FR-003**: O sistema DEVE comparar a assinatura calculada e a fornecida de modo
  resistente a variações de tempo; entradas com tamanho ou codificação inválidos
  devem ser rejeitadas sem tentativa de comparação insegura.
- **FR-004**: O sistema DEVE rejeitar eventos com assinatura ausente, inválida,
  malformada ou incompatível com o corpo, sem extrair mensagens, acionar respostas
  ou registrar o payload completo, retornando uma resposta HTTP de não autorizado.
- **FR-005**: Para eventos autenticados, o sistema DEVE manter o comportamento
  atual: reconhecer eventos sem mensagem de texto, confirmar o recebimento e
  responder de forma assíncrona às mensagens de texto válidas.
- **FR-006**: Os registros de produção DEVEM fornecer categoria do evento,
  resultado da validação, resultado do processamento e contexto de falha seguro,
  sem texto de mensagem, números de telefone, payloads completos, tokens, segredos
  ou cabeçalhos de autorização.
- **FR-007**: O sistema DEVE manter dados de diagnóstico suficientes para
  distinguir falhas de assinatura, corpo inválido, evento sem mensagem aplicável e
  falha na comunicação externa, sem incluir dados pessoais em produção.
- **FR-008**: A alteração DEVE incluir testes unitários de parsing para mensagens
  de texto completas, eventos sem texto e campos incompletos.
- **FR-009**: A alteração DEVE incluir testes unitários de verificação para corpo
  e assinatura correspondentes, cabeçalho ausente, prefixo ou hexadecimal
  malformado, assinatura inválida e corpo incompatível.
- **FR-010**: Quando houver tipos gerados pela configuração de execução que
  representem fielmente as variáveis de ambiente ou contratos usados, o sistema
  DEVE adotá-los como referência, preservando a clareza dos limites de domínio.
- **FR-011**: A solução NÃO DEVE introduzir armazenamento persistente, filas,
  objetos duráveis, serviços adicionais ou dependências de produção sem uma nova
  decisão explícita.
- **FR-012**: Segredos necessários à verificação DEVEM permanecer fora do controle
  de versão, exemplos preenchidos, fixtures e registros.

### Key Entities

- **Evento autenticado**: Conteúdo recebido e assinatura que permite confirmar sua
  origem e integridade antes do processamento.
- **Resultado de verificação**: Decisão de aceitar ou rejeitar um evento e a
  categoria segura que explica a decisão.
- **Mensagem de texto recebida**: Mensagem com remetente, identificador e texto,
  extraída somente após a autenticação do evento.
- **Registro operacional seguro**: Informação de diagnóstico sem credenciais nem
  dados pessoais do cliente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos eventos sem `X-Hub-Signature-256` válido são rejeitados antes de
  qualquer processamento de mensagem ou tentativa de resposta.
- **SC-002**: 100% dos cenários unitários definidos para parsing e verificação são
  aprovados antes de a alteração ser considerada pronta para publicação.
- **SC-003**: Em uma revisão de registros dos cenários cobertos, 0 ocorrências de
  payload completo, texto de mensagem, número de telefone, token, segredo ou
  cabeçalho de autorização aparecem nos logs de produção.
- **SC-004**: Eventos autenticados que já eram suportados mantêm a confirmação de
  recebimento e a resposta assíncrona sem alteração observável para o cliente.
- **SC-005**: A pessoa mantenedora consegue classificar, apenas pelos logs seguros,
  pelo menos 4 resultados: assinatura rejeitada, corpo inválido, evento sem texto
  aplicável e falha de comunicação externa.

## Assumptions

- O segredo da aplicação Meta estará disponível como uma variável secreta no
  ambiente local e no ambiente publicado; seu valor não será colocado no
  repositório.
- A validação abrangerá somente o endpoint de recebimento de eventos; a
  verificação inicial por desafio permanece com seu contrato atual.
- A confirmação bem-sucedida continuará sendo enviada antes do trabalho
  assíncrono, como no fluxo existente.
- A redução de logs aplica-se ao ambiente de produção; qualquer depuração local
  continua sujeita à proibição de registrar credenciais.
- Não há requisito de retenção de eventos, reprocessamento, enfileiramento ou
  mudança de fornecedor neste hardening mínimo.
