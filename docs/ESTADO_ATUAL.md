# Estado atual e histórico de desenvolvimento

**Atualizado em:** 23 de novembro de 2026

**Objetivo deste documento:** permitir que qualquer pessoa retome o projeto sem
repetir tentativas, confundir ambientes ou perder o contexto das decisões.

Este é o ponto de entrada para entender o estado real do AtendenteG. O roteiro
operacional detalhado de homologação está em
[`HOMOLOGACAO_META.md`](HOMOLOGACAO_META.md), e as decisões duradouras estão em
[`DECISIONS.md`](DECISIONS.md).

## Resumo executivo

O AtendenteG já possui um núcleo local validado para três tipos de negócio:

- **barbearia:** agenda e confirma horário automaticamente;
- **limpeza de piscina:** faz triagem e cria solicitação pendente;
- **jardinagem/corte de grama:** faz triagem e cria solicitação pendente.

O **agendamento por WhatsApp real está validado em `staging`**. O app
**AtendenteG Homologação** usa o remetente de teste da Meta e o celular
pessoal do desenvolvedor como destinatário. O webhook recebe e autentica as
mensagens, o Worker responde pela Cloud API e o D1 persiste a reserva.

O erro `131030` foi resolvido para o desenvolvedor ao verificar no painel da
Meta o formato exato do número recebido pelo webhook. Depois, o Worker
passou a usar a credencial sem expiração programada de
`atendenteg-staging-runtime`, com escopo de envio. Após essa troca, o
desenvolvedor completou a jornada novamente. O D1 registrou oito mensagens
novas da mesma conversa e uma nova reserva confirmada.

Depois desse piloto, a medição de valor e o monitor de logs chegaram ao
Worker de homologação. O roteamento por número empresarial, com reserva
e relatório isolados por empresa, passou no ensaio local com dois negócios
fictícios. O reteste remoto dessa última entrega é o próximo marco.

## Estado por ambiente

| Ambiente | Estado | O que foi comprovado | Limite atual |
| --- | --- | --- | --- |
| Local | Pronto | Worker, D1, mock da Cloud API, jornadas e persistência | Não prova entrega real da Meta |
| Homologação | Agendamento validado ponta a ponta | Callback, assinatura, inscrição da conta de teste, recebimento, envio com token de usuário do sistema e reserva confirmada | Ensaio realizado com perfil de barbearia e o próprio desenvolvedor como destinatário |
| Produção | Não utilizada neste piloto | Nada foi alterado nesta etapa | Não deve ser usada para testes |

## Arquitetura que está em uso

```text
WhatsApp do desenvolvedor
  → Cloud API da Meta
  → /webhook do Worker de staging
  → validação de assinatura
  → orquestrador de conversa
  → D1 de staging
  → Cloud API da Meta
  → WhatsApp do desenvolvedor
```

Separações importantes:

- O Worker de homologação e seu D1 são diferentes dos recursos do ambiente
  raiz.
- O app Meta de homologação é diferente do app anterior do projeto.
- O número de teste da Meta é diferente de números de clientes e do número
  pessoal do desenvolvedor.
- Segredos vivem apenas nos cofres do ambiente; não estão neste repositório.

## O que foi desenvolvido e validado antes da Meta

1. O webhook passou a validar a assinatura antes de interpretar o corpo.
2. O endpoint confirma rapidamente o recebimento e processa a jornada em
   segundo plano.
3. Conversas e mensagens processadas são persistidas de forma a impedir
   duplicidade.
4. A barbearia agenda; piscina e jardinagem encaminham solicitações para modo
   humano, sem prometer visita ou preço.
5. Foi criado um mock local da Cloud API e roteiros de smoke test com D1 local.
6. Foi corrigida a configuração TypeScript para que o editor aceite imports com
   extensão `.ts` sem emitir JavaScript.

As verificações atuais passam: geração de tipos, TypeScript, checagem de diff e
28 testes automatizados.

## Linha do tempo do piloto remoto

### 1. Preparação segura da homologação

- Foi criado um ambiente `staging` no Wrangler, com D1 separado e perfil de
  barbearia.
- As migrations foram aplicadas somente nesse D1.
- Foram cadastrados segredos exclusivos de homologação.
- O empacotamento e os testes foram aprovados antes da publicação.

### 2. App Meta isolado

- O app anterior não foi alterado porque já possuía configuração própria de
  webhook.
- Foi criado o app isolado **AtendenteG Homologação**.
- O callback HTTPS e o campo `messages` foram configurados nesse app.
- A primeira tentativa de preenchimento automático dos campos falhou; a
  correção foi feita manualmente no painel, evitando trocar configurações do
  app anterior.

### 3. Requisito de política de privacidade

- A Meta exigiu uma URL pública de política de privacidade para publicar o app.
- Foi adicionada a rota pública `/privacy`, com teste de integração.
- A política foi publicada somente na homologação e informada ao app Meta.

### 4. Primeiro transporte real

- O número de teste da Meta conseguiu enviar um modelo padrão ao telefone de
  teste autorizado.
- A resposta humana inicial não chegou ao Worker. A investigação mostrou que
  validar callback e assinar `messages` não era suficiente: a conta de
  mensagens do número de teste precisava ser inscrita no app.
- A inscrição foi feita pelo fluxo `subscribed_apps` da conta de mensagens de
  teste. Depois disso, uma mensagem humana foi recebida e persistida no D1.

### 5. Resultado importante sobre a inscrição

- A leitura da lista de inscrições ainda mostrou zero logo após o retorno de
  sucesso da Meta.
- Mesmo assim, o ensaio ponta a ponta provou que a inscrição passou a produzir
  entrega real.
- Por isso, a aprovação não deve depender apenas dessa lista: o critério real é
  mensagem recebida, conversa persistida e resposta entregue.

### 6. Tentativa de usar o número pessoal do desenvolvedor

- O número pessoal foi migrado do WhatsApp comum para o WhatsApp Business com
  a intenção de facilitar uma coexistência futura com a API.
- Essa migração foi **prematura para este piloto**. Para ser apenas destinatário
  do número de teste, o WhatsApp comum já era suficiente.
- A migração não deve ser revertida nem o número deve ser registrado na API por
  impulso. Qualquer retorno ao app comum ou uso do número como número comercial
  precisa ser uma decisão separada do proprietário.

### 7. Primeiro diagnóstico da falha de saída

- A mensagem `oi` enviada pelo telefone de teste chega ao Worker e cria estado
  no D1.
- Ao responder, a Cloud API retorna HTTP 400 com código `131030`.
- O destinatário original foi removido e adicionado novamente na Meta; um token
  novo foi gerado e salvo no cofre de homologação. O erro permaneceu.
- Um envio-controlado, fora do Worker, com o token atual e o destinatário que
  iniciou a conversa reproduziu o mesmo código.
- Em 17 de novembro, um segundo destinatário, com WhatsApp já existente e sem
  alteração de registro na Cloud API, foi autorizado no sandbox. Ele enviou uma
  mensagem que chegou ao Worker e foi persistida no D1, mas a resposta pela
  Graph API retornou novamente HTTP 400 / `131030`.

Naquele momento, os ensaios isolaram a falha na saída da Graph API. O
diagnóstico específico do número do desenvolvedor veio na etapa seguinte.

### 8. Separação dos erros de credencial e de destinatário

No reteste do dia 23, o `oi` chegou e ficou registrado. A chamada de saída
retornou `401 / 190`, indicando rejeição da credencial. Um token local
conseguia consultar o número de teste e foi usado na primeira rotação.
O envio passou a retornar `400 / 100`. Texto simples e **Hello World** também
falharam quando enviados diretamente pela Graph API. A consulta a `/app`
mostrou que o token local pertencia a outro app. Isso mostrou por que
validar apenas o acesso de leitura ao número era insuficiente.

O token temporário emitido pelo app **AtendenteG Homologação** confirmou o
app, o acesso ao remetente e a permissão de envio. Com ele, a Graph API
voltou a retornar `400 / 131030`. A comparação privada mostrou que o painel
tinha o número do desenvolvedor **com** o nono dígito, enquanto
`messages[].from` chegava **sem** esse dígito. Foi cadastrado o formato
exato do webhook no mesmo remetente de teste. O desenvolvedor digitou o
código de verificação diretamente no painel.

O **Hello World** chegou ao celular. Na jornada seguinte, o Worker registrou
seis envios bem-sucedidos e o D1 gravou uma reserva confirmada. Uma recusa
posterior ocorreu em outra conversa, identificada por comparação de
contagens sem expor destinatários. O teste do desenvolvedor ficou no estado
`booked`. O ajuste foi feito na lista de destinatários do sandbox.

### 9. Token de longa duração e reteste

- Foi criado o usuário do sistema **atendenteg-staging-runtime** com papel
  **Employee** no portfólio do app de homologação. Foram atribuídos o app,
  a conta de mensagens vinculada e a conta WhatsApp de teste. Os ativos e
  permissões por categoria estão no [roteiro da Meta](HOMOLOGACAO_META.md#credencial-de-envio-de-longa-duração).
- O token foi emitido para **AtendenteG Homologação**, com **Nunca** como
  expiração e apenas a permissão `whatsapp_business_messaging`. A Graph API
  confirmou app, usuário e remetente. Um envio direto de **Hello World**
  foi aceito antes da atualização do secret.
- Após aprovação explícita, a Cloudflare confirmou a ativação de
  `WHATSAPP_ACCESS_TOKEN` no Worker de `staging`. O desenvolvedor repetiu
  o fluxo pelo celular. No D1, as mensagens processadas passaram de 22
  para 30, todas as oito novas pertenciam à mesma conversa, e as reservas
  confirmadas passaram de uma para duas. O estado da conversa ficou
  `booked`.

Esse é o estado validado em 23 de novembro. As contagens são evidências da
execução daquele dia. Compare os incrementos a partir de uma nova linha de
base em futuras validações.

### 10. Medição de valor em homologação

O PR #3 levou ao GitHub a migration `0003_booking_impact.sql`, os comandos
`/calibrar`, `/custo-hora` e `/valor` e o plano de evolução. A migration foi
aplicada ao D1 de `staging` e o responsável foi autorizado pelo secret
`WHATSAPP_OWNER_ID`. As reservas existentes foram preservadas.

O ensaio registrou duas reservas automáticas. Uma delas usou referência de
120 segundos e custo-hora de R$ 60,00. Isso corresponde a 2 minutos
estimados e R$ 2,00 de equivalência de tempo. Cada reserva conserva a
referência vigente na confirmação. Consulte a
[descrição da medida](PROXIMO_INCREMENTO.md) para interpretar o resultado.

### 11. Monitor operacional em homologação

O PR #4 publicou o monitor na branch `staging` e o Worker recebeu o commit
`c1dffe1`. O Terminal do Mac mostrou tanto a recusa de assinatura
(`HTTP 401`) quanto a entrada real autenticada, seguida da gravação da
conversa e do aceite do envio pela Meta.

O comando `npm run logs:staging` usa a configuração de homologação e
mostra eventos filtrados com um rastro aleatório por webhook. O
[guia do monitor](LOGS_OPERACIONAIS.md) também explica como acompanhar os
logs enquanto se trabalha em outra branch.

### 12. Isolamento por número empresarial

O webhook passou a selecionar a empresa por `metadata.phone_number_id`.
Testes com a **Barbearia Central** e o **Salão Aurora** confirmaram
catálogos distintos, resposta pelo remetente correto e duas reservas no
mesmo horário para o mesmo cliente fictício. Cada responsável viu somente
o relatório correspondente, com referências de 2 e 5 minutos. O ensaio
bloqueou acesso cruzado e uma tentativa de recalibrar a outra empresa.

O código unifica o roteamento com o rastro operacional. Uma mensagem sem
rota configurada gera um evento seguro para diagnóstico. Os 34 testes
automatizados passaram com SQLite local e Graph simulada. O Worker remoto
segue na versão de logs identificada acima até a publicação e validação
autorizadas dessa entrega.

## Decisões tomadas e por quê

| Decisão | Motivo | Estado |
| --- | --- | --- |
| Usar staging separado | Impedir qualquer impacto em produção | Implementada |
| Criar app Meta isolado | Preservar o app e callback existentes | Implementada |
| Usar número de teste da Meta | Evitar mexer nos números dos negócios participantes | Implementada |
| Inscrever cada conta de mensagens no app | Callback válido não garante entrega de eventos | Implementada |
| Não usar o número pessoal como número comercial agora | Registro tradicional pode desconectar o app existente | Mantida |
| Preservar o celular pessoal como destinatário | O mesmo número funcionou com o formato verificado recebido pelo webhook | Validada |
| Conferir app, usuário e remetente antes da troca de credencial | Um token de outro app passou na leitura do remetente e falhou no envio | Validada |
| Usar token do usuário do sistema dedicado ao envio | Evita a expiração recorrente do token temporário de configuração | Ativa em staging |

Veja as ADRs 010 a 013 em [DECISIONS.md](DECISIONS.md).

## O que não deve ser repetido

1. Não usar o app existente da Meta para homologação.
2. Não configurar callback somente no painel e assumir que os eventos chegarão:
   a conta de mensagens precisa estar inscrita no app.
3. Não confiar apenas na leitura da lista de inscrições do sandbox; fazer o
   ensaio ponta a ponta.
4. Não registrar número pessoal ou de cliente no fluxo tradicional de produção
   só para experimentar.
5. Não migrar um número pessoal para WhatsApp Business apenas para ser
   destinatário de teste.
6. Não deixar `wrangler tail` aberto durante o GET de verificação, pois a URL
   pode carregar token de verificação.
7. Não registrar texto, telefone, token, App Secret, assinatura ou payload
   completo em logs e documentos.

## Retomada em desenvolvimento

1. Para mudanças no código, siga a [validação local](LOCAL_VALIDATION.md)
   com Worker, D1 e Graph API simulados.
2. Para retestar o WhatsApp real, use o remetente, o próprio celular e a
   credencial dedicados que já estão ativos. Compare as contagens do D1
   antes e depois da jornada.
3. Se a homologação precisar ser montada novamente, siga a ordem em
   [HOMOLOGACAO_META.md](HOMOLOGACAO_META.md). Confirme o vínculo entre app,
   conta de mensagens, remetente, destinatário e credencial antes de
   publicar qualquer alteração.
4. Se surgir um erro de saída, use a tabela de diagnóstico do roteiro.
   O `190` pede checagem da credencial. O `100` pede validação de identidade
   e teste direto. O `131030` pede verificar o cadastro para o formato
   exato recebido.

## Repositório e rastreabilidade

- O projeto está em repositório público no GitHub, com `main` rastreando
  `origin/main`.
- Novas mudanças partem de `staging` e passam pelo check **TypeScript e testes**.
  Siga o [fluxo de Git](WORKFLOW_GIT.md) para homologar e promover uma versão.
- O histórico da homologação está nos PRs da medição de valor e dos logs.
  A branch `staging` reúne o código candidato. O Worker remoto muda por
  publicação manual de uma revisão aprovada.

## Leitura recomendada para retomar

1. Este arquivo: visão geral e último estado real.
2. `HOMOLOGACAO_META.md`: comandos e procedimento seguro.
3. `LOCAL_VALIDATION.md`: validação sem Meta ou recursos remotos.
4. `DECISIONS.md`: limites de arquitetura e decisões aceitas.
