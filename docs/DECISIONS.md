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

**Status:** Implementada e validada em homologação

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

**Status:** Implementada e validada localmente e em homologação

A jornada usa D1 para conversas e reservas. O domínio depende de uma abstração
de repositório e o adaptador Cloudflare/D1 fica isolado. Os critérios estão em
`specs/002-booking-journey/`.

As migrations foram exercitadas localmente e aplicadas ao D1 de `staging`.
O ensaio real confirmou a persistência de conversas e reservas nesse ambiente.
Veja [ESTADO_ATUAL.md](ESTADO_ATUAL.md) para as evidências do piloto.

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
homologação pelo fluxo `subscribed_apps`, com uma credencial de configuração
autorizada para aquela mesma conta. O token do Worker tem apenas permissão de
envio e fica fora dessa operação.

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

O remetente da homologação é o número de teste fornecido pela Meta. O número
do desenvolvedor é o destinatário verificado. No piloto, a migração do número
pessoal foi prematura e o mesmo número funcionou quando o cadastro da Meta
passou a corresponder ao identificador recebido pelo webhook. Uma mudança no
WhatsApp pessoal exige decisão separada do proprietário.

## ADR-012 — Preservar o identificador do WhatsApp na resposta

**Status:** Aceita em 23 de novembro de 2026

O Worker usa o identificador recebido em `messages[].from` para endereçar a
resposta e identificar a conversa. No sandbox, a lista de destinatários precisa
aceitar esse formato. O piloto recebeu um número brasileiro sem o nono dígito
enquanto o painel tinha cadastrado o mesmo número com o dígito. A verificação
do formato recebido corrigiu o erro `131030` para aquela conversa. O código
preserva o identificador de entrada. Uma regra genérica de remoção ou adição de
dígitos poderia endereçar a mensagem a outro destinatário.

## ADR-013 — Credencial de envio dedicada à homologação

**Status:** Aceita e validada em 23 de novembro de 2026

O Worker de `staging` usa um token de usuário do sistema, emitido pelo app
**AtendenteG Homologação**, com `whatsapp_business_messaging` e sem expiração
programada. O usuário `atendenteg-staging-runtime` tem papel **Employee** e
recebeu acesso apenas aos ativos de teste necessários. A conta do WhatsApp e a
conta de mensagens vinculada são atribuições explícitas. Tokens de configuração
podem ter permissões de gerenciamento quando a operação exigir.

Valide a identidade do app, do usuário do sistema e do remetente e faça um envio
controlado antes da ativação em `staging`. A troca do secret ativa uma versão e
segue a regra de autorização da ADR-006. O procedimento e o reteste pelo celular
estão em [HOMOLOGACAO_META.md](HOMOLOGACAO_META.md).
