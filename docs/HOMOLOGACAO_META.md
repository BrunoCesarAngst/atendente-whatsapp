# Homologação real com a Meta e o número de teste

Este documento é o procedimento operacional do piloto remoto. Ele explica a
cadeia inteira — Meta, Worker de `staging`, D1 de `staging` e número de teste —
e registra a falha mais fácil de repetir: configurar um callback válido **não**
inscreve automaticamente o app na conta de mensagens que possui o número.

Use-o antes de qualquer novo piloto. Não use números de clientes, produção ou
dados reais nesta etapa.

Para desenvolvimento cotidiano, comece com
[Worker, D1 e Graph API simulada](LOCAL_VALIDATION.md). Use este roteiro quando
precisar confirmar o transporte real. A configuração validada em 23 de novembro
de 2026 está em [ESTADO_ATUAL.md](ESTADO_ATUAL.md). Numa retomada, preserve os
recursos que já estão operacionais e execute primeiro o ensaio ponta a ponta.

## Objetivo e limites

O objetivo é provar que uma mensagem real percorre esta sequência:

```text
WhatsApp do destinatário autorizado
  → número de teste da Meta
  → conta de mensagens de teste inscrita no app
  → webhook HTTPS de staging
  → validação de assinatura
  → Worker e D1 de staging
  → resposta pela Cloud API
  → WhatsApp do destinatário autorizado
```

O primeiro perfil é `barbershop`. Piscina e jardinagem entram depois que o
transporte estiver validado; eles devem abrir solicitação pendente e transferir
para humano, sem marcar visita ou preço automaticamente.

## Regras de isolamento

| Item | Produção | Homologação |
| --- | --- | --- |
| Worker | ambiente raiz | ambiente `staging` |
| Banco D1 | banco raiz | D1 exclusivo de `staging` |
| Remetente WhatsApp | fora do piloto | número de teste da Meta |
| Destinatário WhatsApp | fora do piloto | número pessoal do desenvolvedor, verificado na Meta |
| App Meta | app existente | app isolado de homologação |
| Segredos | não reutilizar por conveniência | cadastrados somente em `staging` |

O ambiente `staging` está em `wrangler.jsonc`. Use `--env staging` nos comandos
remotos do Wrangler. Na Meta, confirme que o app é **AtendenteG Homologação**,
que o remetente da Etapa 1 corresponde ao `WHATSAPP_PHONE_NUMBER_ID` de
`staging` e que a conta de mensagens pertence a esse remetente. Preserve o
WhatsApp pessoal do desenvolvedor como destinatário.

## Conceitos que não podem ser confundidos

Há três configurações independentes na Meta:

1. **Callback do app:** URL HTTPS e token de verificação em
   **Casos de uso → Conectar no WhatsApp → Etapa 2 → Configurar webhooks**.
   Essa etapa valida o `GET /webhook`.
2. **Campo de evento:** o campo `messages` precisa estar assinado na mesma tela.
   Ele diz quais categorias o app aceita receber.
3. **Inscrição da conta de mensagens:** cada conta de mensagens (WABA) precisa
   estar inscrita no app pelo endpoint `subscribed_apps`. Sem isso, a Meta pode
   validar o callback e até permitir envio de modelo, mas não encaminhar
   mensagens recebidas ao Worker.

O número de teste da **Etapa 1** pertence a uma conta de mensagens de teste. Ela
pode ser diferente da conta que aparece na **Etapa 2**. Inscrever a conta da
Etapa 2 não substitui a inscrição da conta de teste.

## Pré-requisitos locais

Antes de qualquer alteração remota, execute:

```sh
npm run cf-typegen
npm run cf-typegen -- --check
npm run typecheck
npm test
git diff --check
npx wrangler versions upload --env staging --dry-run
```

Para publicação, migration remota, segredo remoto ou alteração no painel da
Meta, obtenha autorização explícita do proprietário na conversa atual.

## Preparar o Worker e o D1 de homologação

1. Confirme que o D1 de `staging` é um banco separado e vazio ou conhecido.
2. Aplique migrations somente com `--env staging` e `--remote`.
3. Cadastre os segredos no Worker de `staging`. Use
   `WHATSAPP_VERIFY_TOKEN` para o desafio de verificação do callback e
   `WHATSAPP_APP_SECRET` do app isolado para validar a assinatura dos eventos.
   Configure `WHATSAPP_ACCESS_TOKEN` conforme
   [Credencial de envio de longa duração](#credencial-de-envio-de-longa-duração).
4. Publique somente após as verificações locais aprovadas.
5. Confirme, sem expor valores, que a rota `/health` responde e que
   `/privacy` está pública. A URL de política é requisito para publicar o app
   de homologação na Meta.

Nunca use `wrangler secret list` para tentar obter valores: ele só confirma
nomes. Nunca cole token, App Secret, assinatura, telefone ou payload real em
Git, documentação, terminal gravado ou chat.

## Configurar o app isolado na Meta

No app de homologação, abra **Casos de uso → Conectar no WhatsApp**.
Ao montar um ambiente novo, configure o callback e o campo `messages`,
identifique o remetente e verifique o destinatário na Etapa 1, inscreva a
conta de mensagens e configure o token do Worker. Em seguida, execute o
ensaio completo. Com uma homologação ativa, comece pelo ensaio e corrija
somente a etapa que falhar.

### Etapa 2 — callback e campos

1. Abra **Configuração da produção → Configurar webhooks**.
2. Em **URL de callback**, informe a URL pública de `staging` terminando em
   `/webhook`.
3. Em **Verificar token**, informe exatamente o segredo de verificação de
   `staging`.
4. Clique em **Verificar e salvar**.
5. Assine o campo **`messages`**.

O sucesso aqui prova apenas o handshake do callback. Ele não prova a entrega de
mensagens recebidas; a inscrição da conta, descrita adiante, continua
obrigatória.

### Etapa 1 — número e destinatário de teste

1. Abra **Experimente**.
2. Confira o número de teste no campo **De**, o **Phone Number ID** e a
   **Identificação da conta de mensagens** da mesma tela. Use essa conta em
   `subscribed_apps`.
3. Em **Destinatário → Gerenciar lista de números de telefone**, adicione o
   número do desenvolvedor. Selecione o DDI correspondente e conclua a
   verificação digitando o código recebido diretamente no painel da Meta.
4. Selecione esse destinatário e valide **Hello World** pelo painel. Depois de
   inscrever a conta e configurar o token do Worker, envie `oi` do celular.
   Se a saída retornar `131030`, siga a
   [checagem do identificador](#131030-identificador-do-destinatário) antes de
   renovar token ou alterar outros recursos.

O botão **Gerar token** dessa tela emite um token de usuário temporário. Use-o
para a configuração inicial quando necessário, com a conta de teste
selecionada. A credencial de envio que fica no Worker é a do usuário do
sistema. Consulte o [guia inicial da Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started).

## Passo obrigatório: inscrever a conta de mensagens no app

Faça este passo para **cada** conta de mensagens usada no piloto, inclusive a
conta criada automaticamente para o número de teste.

Use uma credencial de configuração do mesmo app e com acesso de gerenciamento
à conta de mensagens de teste. O token de envio do Worker tem escopo apenas de
mensagens. No exemplo, informe o ID da conta de mensagens, a versão da Graph
API configurada em `staging` e o token, nessa ordem. A resposta exibida contém
apenas o sucesso ou o código operacional. Execute com o rastreamento de shell
desativado.

```sh
(
  set +x
  set -o pipefail
  read -r conta_de_teste
  read -r versao_graph
  unset token_configuracao
  read -rs token_configuracao
  printf '\n'
  printf 'Authorization: Bearer %s\n' "$token_configuracao" |
    curl --silent --show-error --request POST --header @- \
      "https://graph.facebook.com/${versao_graph}/${conta_de_teste}/subscribed_apps" |
    jq -e 'if .success == true then {sucesso: true}
      else error("Meta recusou a inscrição, código " + ((.error.code | numbers // 0) | tostring))
      end'
)
```

O retorno esperado confirma sucesso. Guarde somente o resultado operacional;
nunca o token. Depois, se necessário, confira a associação com uma leitura
protegida do mesmo endpoint usando `GET`.

### Observação importante sobre a conta de teste

No piloto realizado, o `POST` retornou sucesso e a próxima mensagem real foi
processada, embora a leitura imediatamente posterior ainda mostrasse zero
inscrições. Portanto, no sandbox de teste, a leitura isolada não é o critério
final. O critério definitivo é sempre o ensaio ponta a ponta abaixo: uma
mensagem recebida deve gerar registro no D1 e resposta no WhatsApp.

Se o `POST` falhar por permissão, gere um token com as permissões adequadas e
confirme que ele pertence ao mesmo app e à mesma conta de mensagens da Etapa 1.

## 131030: identificador do destinatário

Se a mensagem humana chega ao D1 e a Meta recusa a resposta com `131030`,
compare o identificador de `messages[].from`, persistido como `customer_id`,
com o registro da Etapa 1 do **mesmo remetente**. No piloto, os dois registros
correspondiam ao mesmo celular brasileiro, porém o cadastro tinha o nono
dígito e o webhook vinha sem ele. Renovar o token e cadastrar novamente o
formato anterior não resolveu.

1. Isole uma mensagem recém-enviada pelo desenvolvedor. A consulta abaixo
   classifica só a entrada mais recente e serve quando esse envio foi o último
   do ambiente. Compare pelo DDI e pelos dígitos completos em memória ou na
   interface privada quando precisar confirmar a equivalência. Guarde apenas
   o resultado da comparação.
2. No painel da Etapa 1, cadastre o **formato exato recebido** para o próprio
   número e conclua a verificação com o código digitado pelo desenvolvedor no
   painel. No caso reproduzido, isso significou selecionar **Brasil (+55)** e
   informar DDD e número do identificador recebido, sem inserir o nono dígito.
   A existência dessa diferença precisa ser verificada em cada caso.
3. Selecione esse registro e teste **Hello World**. Após confirmar a entrega,
   peça uma nova saudação e confirme a resposta automática e a reserva.
4. Se continuar falhando, compare o envio direto da Meta e a resposta do
   Worker, usando o mesmo app, remetente e destinatário. Registre somente o
   resultado operacional para diagnóstico no ambiente de teste.

```sh
npx wrangler d1 execute DB --remote --env staging --command \
  "SELECT CASE
    WHEN customer_id GLOB '*[^0-9]*' THEN 'identificador_nao_numerico'
    WHEN substr(customer_id,1,2) = '55' AND length(customer_id) = 13
      AND substr(customer_id,5,1) = '9' THEN 'br_com_nono_digito'
    WHEN substr(customer_id,1,2) = '55' AND length(customer_id) = 12
      THEN 'br_sem_nono_digito'
    ELSE 'outro_formato'
  END AS formato
  FROM processed_messages ORDER BY rowid DESC LIMIT 1;"
```

Preserve `messages[].from` no código. A diferença encontrada é uma
característica do cadastro desse destinatário no sandbox. A migração do
WhatsApp pessoal, o registro do número na Cloud API e pedir um número
emprestado ficam fora desse fluxo.

## Credencial de envio de longa duração

Use o [Meta Business Suite](https://business.facebook.com/latest/settings)
no portfólio do app **AtendenteG Homologação**, em **Usuários do sistema**.
Se `atendenteg-staging-runtime` já existe, confira os ativos antes de gerar
uma nova credencial. Para replicar a configuração:

1. Crie `atendenteg-staging-runtime` com papel **Employee**.
2. Em **Atribuir ativos**, selecione exclusivamente os três ativos de
   homologação:
   - **Apps → AtendenteG Homologação**, com **Gerenciar app**.
   - **Contas de mensagens → Contas vinculadas**, com a conta cujo ID
     corresponde à Etapa 1, com **Tudo** nessa conta de teste. As outras
     opções que apareceram nesse seletor se limitavam a modelos.
   - **Contas do WhatsApp → Test WhatsApp Business Account**, a conta
     WhatsApp vinculada à conta de mensagens de teste, com **Mensagens** e
     **Números de telefone (apenas visualização)**. Os dois tipos de conta
     aparecem em categorias distintas e podem ter IDs diferentes.
3. Conclua a atribuição e recarregue a página. Selecione o usuário de staging
   novamente e confirme os três ativos. Na Business Suite, a atribuição à
   conta de mensagens precisa ser acompanhada da atribuição explícita à
   conta do WhatsApp.
4. Clique em **Gerar token**, selecione exatamente **AtendenteG Homologação**,
   escolha **Nunca** e conceda apenas `whatsapp_business_messaging`. A
   credencial em uso no Worker foi emitida com esse escopo.
5. Antes de ativar, consulte a Graph API com a credencial nova. Confirme o app
   e o usuário do sistema, o acesso ao remetente de teste e o aceite de um
   **Hello World** para o telefone verificado do desenvolvedor. Use
   `GET /app?fields=id,name`, `GET /me?fields=id,name` e
   `GET /{Phone-Number-ID}?fields=id` com a versão da Graph de `staging`.
   Uma consulta bem-sucedida ao número, sozinha, é insuficiente. Um token de
   outro app passou nesse teste de leitura e falhou nos envios.
6. Informe o comando abaixo, o ambiente e as validações ao proprietário.
   Aguarde autorização explícita. O Wrangler aceita o token no prompt
   protegido ou por entrada padrão. Mantenha a credencial fora de chat,
   argumentos de comando, arquivos do projeto e logs. Depois, feche a tela que
   revelou o token e limpe eventual cópia temporária da área de transferência.

```sh
npx wrangler secret put WHATSAPP_ACCESS_TOKEN --env staging
```

Esse comando cria e ativa imediatamente uma versão do Worker. A validação do
token direto na Meta vem antes da ativação. Em seguida, envie um novo `oi` pelo
celular para verificar que o **Worker** responde com o secret atualizado. Um
token sem expiração programada ainda pode ser revogado. Se ele for invalidado,
verifique a causa e repita a rotação para o mesmo usuário e app de homologação.

Referências operacionais:
[tokens e acesso a ativos na Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens),
[API de mensagens](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api)
e [secrets do Wrangler](https://developers.cloudflare.com/workers/configuration/secrets/).

## Ensaio ponta a ponta

### 1. Validar saída

Na Etapa 1, selecione o cadastro verificado do desenvolvedor cujo formato
corresponde ao recebido pelo webhook. Envie **Hello World** e confirme a
entrega no WhatsApp. O aceite da API comprova a aceitação da solicitação. A
entrega é confirmada pelo celular ou pelo status correspondente da Meta.

### 2. Observar sem registrar dados sensíveis

Anote primeiro as contagens do D1 com o comando da etapa seguinte. Em outro
terminal, observe apenas os eventos operacionais de mensagens recebidas por
`POST`. O filtro descarta o restante antes de exibir a saída.

```sh
npx wrangler tail --env staging --method POST --format json |
  jq --unbuffered -c '
    .logs[]?.message[]? | strings | (try fromjson catch empty)
    | select(.event == "whatsapp_send_succeeded"
          or .event == "whatsapp_send_failed"
          or .event == "webhook_signature_rejected"
          or .event == "webhook_ignored"
          or .event == "message_processing_failed")
    | {event, httpStatus, graphErrorCode, graphErrorSubcode}'
```

Não faça a verificação `GET /webhook` enquanto o tail estiver aberto: URLs de
verificação carregam o token como query string e podem aparecer na observação.
Use o tail somente durante o ensaio e encerre-o ao final. Correlacione horário
e contagens com a ação do desenvolvedor. Eventos próximos podem pertencer a
outra conversa.

### 3. Validar entrada

O destinatário autorizado responde `oi` ao número de teste. O resultado
esperado é:

- o Worker recebe um `POST /webhook` autenticado;
- não há `webhook_signature_rejected` nem `message_processing_failed`;
- o atendente responde no WhatsApp;
- o D1 registra uma conversa e uma mensagem processada.

Faça a leitura somente por contagens, nunca exibindo texto de conversa ou
telefone:

```sh
npx wrangler d1 execute DB --remote --env staging --command \
  "SELECT
    (SELECT COUNT(*) FROM conversations) AS conversas,
    (SELECT COUNT(*) FROM processed_messages) AS mensagens_processadas,
    (SELECT COUNT(*) FROM appointments WHERE status = 'confirmed') AS reservas_confirmadas;"
```

Em uma conversa existente, o total de conversas pode permanecer igual. O
total de mensagens processadas aumenta com a nova saudação. Use a diferença
em relação à contagem inicial. A tabela `customers` fica fora dessa
verificação porque o repositório atual não a preenche.

### 4. Validar a jornada

No mesmo WhatsApp, envie a saudação e toque em **Agendar horário**. Escolha
serviço, data e horário. Toque em **Confirmar** e confira a resposta final.
O total de reservas confirmadas deve subir em uma unidade por jornada
concluída, inclusive em um banco com histórico. Use um horário disponível.
O replay do mesmo ID de mensagem é verificado pelo smoke test local. Uma
nova ação no WhatsApp pode gerar um ID novo, então teste esses casos
separadamente.

## Diagnóstico rápido

| Sintoma | Causa mais provável | Ação segura |
| --- | --- | --- |
| A Meta não salva callback | URL sem HTTPS, rota diferente de `/webhook` ou token diferente | Testar o `GET /webhook` fora do tail; conferir os dois campos manualmente sem mostrar o token |
| Modelo padrão não chega | remetente, credencial ou destinatário incompatível | Conferir app, remetente e registro verificado na Etapa 1. Ler o código operacional do envio |
| Modelo chega, mas `oi` não chega ao Worker | conta de mensagens não inscrita no app | Executar o `POST .../subscribed_apps` para a conta da Etapa 1 e repetir o ensaio |
| Worker retorna `webhook_signature_rejected` | App Secret do app de homologação não corresponde ao segredo de `staging` | Revelar o segredo somente no painel da Meta e substituir apenas o segredo remoto de `staging` |
| Evento aparece como `webhook_ignored` | evento de status, não mensagem recebida | É esperado para status de entrega; repetir com uma mensagem humana de texto |
| `401 / 190` na saída | a Meta rejeitou o token usado no envio | Validar vigência, app e remetente antes de rotacionar o secret. Preferir a credencial dedicada do usuário do sistema |
| `400 / 100` na saída | rejeição genérica. No piloto, o token usado pertencia a outro app | Conferir primeiro a identidade do app e o acesso ao remetente. Comparar com texto simples e **Hello World** antes de alterar o payload ou o código |
| `400 / 131030` após a entrada chegar ao D1 | identificador de destino não aceito na lista do remetente de teste | Comparar cadastro e identificador do webhook. Verificar o formato exato do próprio número antes de repetir o envio |
| A Etapa 2 pede desconectar WhatsApp Business existente | é o fluxo tradicional de registro, não coexistência | Fechar o formulário; não desconectar o número pessoal durante o piloto |

## Números reais e coexistência

Não registre um número pessoal ou de cliente no formulário tradicional da
Etapa 2 durante esta fase: ele pode exigir desconexão do WhatsApp existente.

Para manter o WhatsApp Business app e a Cloud API no mesmo número, a Meta exige
o fluxo de coexistência via Embedded Signup e credenciamento de parceiro/Tech
Provider. Isso é uma decisão posterior, com análise de produto, suporte e
privacidade. O piloto com número de teste deve estar completamente aprovado
antes dessa decisão.

## Critério de aprovação e retorno rápido

O piloto passa quando todos os itens forem verdadeiros:

- callback validado;
- `messages` assinado;
- conta de mensagens correta inscrita no app;
- modelo de teste entregue;
- mensagem humana recebida, autenticada e processada uma única vez;
- resposta automática entregue;
- jornada de barbearia concluída com uma nova reserva confirmada no D1;
- após troca de secret, nova mensagem do celular e resposta do Worker com a
  credencial ativa;
- registros aparecem somente no D1 de `staging`;
- nenhum segredo, telefone, texto ou payload completo aparece nos logs.

Para interromper o experimento, remova a inscrição da conta de teste ou retire
o callback no app de homologação. Não altere o app, o Worker, o D1 ou o número
de produção como forma de encerrar um piloto.
