# Decisões de arquitetura

## ADR-001 — Manter o webhook como um único Worker

**Status:** Aceita

O serviço permanece um único Cloudflare Worker com Hono. A divisão ocorre por
responsabilidade dentro de `src/`, sem introduzir serviços adicionais enquanto o
fluxo atual puder ser mantido com clareza e testes.

## ADR-002 — Separar domínio de Meta e Cloudflare

**Status:** Aceita

Regras de atendimento, configuração da barbearia e futuras regras de conversa
não dependem de Hono, Cloudflare, D1 ou contratos da Meta. A integração do
WhatsApp fica em `src/whatsapp/`, e `src/index.ts` atua como adaptador HTTP.

## ADR-003 — Segredos somente no ambiente

**Status:** Aceita

Access token, verify token, App Secret e quaisquer credenciais futuras são
fornecidos exclusivamente por bindings/secrets do ambiente. É proibido incluí-los
em Git, documentação executável, fixtures, logs ou mensagens de erro.

## ADR-004 — Segurança do webhook antes de evolução funcional

**Status:** Em implementação planejada

O webhook deve validar `X-Hub-Signature-256` sobre os bytes originais do corpo
antes de processar eventos. A decisão e os critérios estão documentados em
`specs/001-harden-webhook/`. Eventos autenticados devem preservar o contrato
existente de confirmação e processamento assíncrono.

## ADR-005 — Testes como gate de mudança e publicação

**Status:** Aceita

Alterações de comportamento devem incluir testes de regressão. `npm test` é
obrigatório antes de considerar a mudança pronta. Alterações de bindings também
devem atualizar os tipos gerados quando aplicável.

## ADR-006 — Publicação exige autorização explícita

**Status:** Aceita

Nenhuma IA está autorizada a executar deploy, `wrangler deploy`, migração remota
ou outra publicação por iniciativa própria. Mesmo após testes aprovados, a
publicação só ocorre mediante pedido explícito do proprietário na conversa atual.

## ADR-007 — Persistência de agendamentos somente com fronteira própria

**Status:** Em implementação local

A jornada de agendamento proposta prevê D1 para conversas e reservas. Caso seja
implementada, o domínio dependerá de uma abstração de repositório e o adaptador
Cloudflare/D1 ficará isolado. A decisão ainda depende da execução e validação de
`specs/002-booking-journey/`.

Uma migration e um adaptador D1 foram validados somente em cópias locais. O
binding `DB` está configurado para permitir essa simulação, mas nenhuma migration
remota foi executada e esse fato não comprova o estado do banco remoto.

## ADR-008 — Mock local explícito para a Cloud API do WhatsApp

**Status:** Aceita

O adaptador da Cloud API mantém `https://graph.facebook.com` como destino padrão.
Somente o ambiente local pode optar por outro destino através de
`WHATSAPP_GRAPH_API_BASE_URL` em `.dev.vars`, arquivo ignorado pelo Git. O mock
local fica limitado a `127.0.0.1`, não recebe nem registra segredos e expõe
apenas metadados das respostas simuladas. Isso permite validar Worker, D1 e a
jornada sem chamar a Meta nem publicar configurações.

## ADR-009 — Triagem antes de orçamento ou visita

**Status:** Aceita

Perfis de piscina e jardinagem registram uma solicitação pendente e interrompem
a automação após coletar informações mínimas. O Worker não promete preço,
disponibilidade, visita ou retorno proativo. A decisão humana e uma integração
de notificação ficam fora deste incremento; assim, os dados e as regras podem
ser validados localmente sem assumir um canal operacional inexistente.

## ADR-010 — Inscrição explícita da conta de mensagens por ambiente

**Status:** Aceita

O callback do app e o campo `messages` não bastam para que a Meta entregue
eventos de uma conta de mensagens (WABA). Cada conta, inclusive a conta de
teste criada na Etapa 1 da Meta, deve ser inscrita explicitamente no app de
homologação pelo fluxo `subscribed_apps`, com token temporário ou permanente
autorizado para aquela mesma conta.

O procedimento, a distinção entre callback, campo e inscrição, e os sinais de
diagnóstico estão em `docs/HOMOLOGACAO_META.md`. A aprovação exige uma mensagem
humana recebida e processada ponta a ponta; uma leitura isolada da lista de
inscrições da conta de teste não substitui esse ensaio, pois o sandbox pode
demorar a refletir a associação apesar de a entrega já funcionar.

## ADR-011 — Não migrar número pessoal para atuar somente como destinatário de teste

**Status:** Aceita

O número de teste da Meta aceita telefones autorizados como destinatários de
sandbox; esses telefones não precisam ser números comerciais, nem estar
registrados na Cloud API. Uma migração de WhatsApp comum para WhatsApp Business
só deve ser considerada diante de uma necessidade de negócio independente,
como coexistência futura, com avaliação de impacto e plano de reversão.

No piloto inicial, a migração de um número pessoal ocorreu antes de ser
necessária e coincidiu com um estado de autorização inconsistente da Meta para
aquele destinatário. A partir desta decisão, o piloto deve preferir um número
de teste sem migração recente. O número pessoal já migrado não será alterado
sem decisão explícita do proprietário.
