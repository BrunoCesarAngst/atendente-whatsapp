# Estado atual e histórico de desenvolvimento

**Atualizado em:** 16 de novembro de 2026  
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

Também existe uma homologação remota isolada na Cloudflare, conectada a um app
Meta isolado e ao número de teste da Meta. A cadeia de **entrada** já foi
provada: uma mensagem real chegou ao webhook, teve a assinatura validada, criou
conversa e foi deduplicada no D1 de homologação.

O único bloqueio atual é a **resposta automática de saída** para o telefone
pessoal usado como destinatário de teste. A Meta devolve o código operacional
`131030`, que indica que o sandbox não reconhece esse destinatário como
autorizado, apesar de ele aparecer selecionado no painel. Esse comportamento
foi reproduzido fora do Worker, portanto não é uma falha local do projeto.

## Estado por ambiente

| Ambiente | Estado | O que foi comprovado | Limite atual |
| --- | --- | --- | --- |
| Local | Pronto | Worker, D1, mock da Cloud API, jornadas e persistência | Não prova entrega real da Meta |
| Homologação | Ativo e isolado | Callback, assinatura, webhook de entrada, D1 remoto e inscrição da conta de teste | Resposta de saída bloqueada pelo sandbox para o destinatário atual |
| Produção | Não utilizada neste piloto | Nada foi alterado nesta etapa | Não deve ser usada para testes |

## Arquitetura que está em uso

```text
Cliente no WhatsApp
  → Cloud API da Meta
  → /webhook do Worker de staging
  → validação de assinatura
  → orquestrador de conversa
  → D1 de staging
  → Cloud API da Meta
  → cliente no WhatsApp
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

### 7. Falha atual de saída

- A mensagem `oi` enviada pelo telefone de teste chega ao Worker e cria estado
  no D1.
- Ao responder, a Cloud API retorna HTTP 400 com código `131030`.
- O destinatário foi removido e adicionado novamente na Meta; um token novo foi
  gerado e salvo no cofre de homologação.
- O erro permaneceu.
- Um envio-controlado, fora do Worker, com o token atual e o destinatário que
  iniciou a conversa reproduziu o mesmo código.

**Conclusão:** a falha não está no webhook, D1, jornada, token armazenado ou
configuração local do Worker. Ela está no reconhecimento do destinatário pela
lista de teste da Meta, provavelmente em estado transitório ou inconsistente
após a migração para WhatsApp Business.

## Decisões tomadas e por quê

| Decisão | Motivo | Estado |
| --- | --- | --- |
| Usar staging separado | Impedir qualquer impacto em produção | Implementada |
| Criar app Meta isolado | Preservar o app e callback existentes | Implementada |
| Usar número de teste da Meta | Evitar mexer nos números dos negócios participantes | Implementada |
| Inscrever cada conta de mensagens no app | Callback válido não garante entrega de eventos | Implementada |
| Não usar o número pessoal como número comercial agora | Registro tradicional pode desconectar o app existente | Mantida |
| Não migrar número pessoal apenas para ser destinatário de sandbox | Não é necessário e pode criar confusão operacional | Nova regra para o futuro |
| Esperar até o próximo dia antes de novas tentativas | Dar tempo à Meta para propagar a nova autorização | Pendente |

Veja as decisões arquiteturais formais em `DECISIONS.md`, especialmente
ADR-010 e ADR-011.

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

## Próxima retomada: roteiro exato

1. Não alterar a configuração atual durante a espera.
2. No próximo dia, executar primeiro um **envio-controlado** com a credencial
   atual para o destinatário reautorizado.
3. Se a Meta aceitar, iniciar o fluxo de barbearia do começo: saudação, serviço,
   data, horário e confirmação.
4. Confirmar no D1 uma conversa, as mensagens processadas esperadas e uma única
   reserva confirmada.
5. Reenviar a confirmação para validar que não há reserva duplicada.
6. Se o código `131030` persistir, não mexer no número pessoal nem em produção.
   Escolher uma alternativa deliberada:
   - usar outro WhatsApp existente de pessoa autorizada somente como destinatário
     de teste; ou
   - criar uma configuração de teste nova e repetir o piloto com recursos
     isolados.

Um segundo telefone usado apenas como destinatário não precisa ser WhatsApp
Business, não será registrado na API e não terá seu atendimento alterado.

## Repositório e rastreabilidade

- O projeto está em repositório público no GitHub, com `main` rastreando
  `origin/main`.
- O commit de homologação anterior reuniu staging, política pública, testes e
  roteiro inicial.
- Esta atualização histórica deve ser revisada e publicada no próximo commit
  para manter o repositório como fonte central de continuidade.

## Leitura recomendada para retomar

1. Este arquivo: visão geral e último estado real.
2. `HOMOLOGACAO_META.md`: comandos e procedimento seguro.
3. `LOCAL_VALIDATION.md`: validação sem Meta ou recursos remotos.
4. `DECISIONS.md`: limites de arquitetura e decisões aceitas.
