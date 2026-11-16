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
