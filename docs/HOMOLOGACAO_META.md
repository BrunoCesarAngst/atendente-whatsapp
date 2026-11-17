# Homologação real com a Meta e o número de teste

Este documento é o procedimento operacional do piloto remoto. Ele explica a
cadeia inteira — Meta, Worker de `staging`, D1 de `staging` e número de teste —
e registra a falha mais fácil de repetir: configurar um callback válido **não**
inscreve automaticamente o app na conta de mensagens que possui o número.

Use-o antes de qualquer novo piloto. Não use números de clientes, produção ou
dados reais nesta etapa.

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
| Número WhatsApp | nunca usado neste roteiro | número de teste da Meta |
| App Meta | app existente | app isolado de homologação |
| Segredos | não reutilizar por conveniência | cadastrados somente em `staging` |

O ambiente `staging` é declarado explicitamente em `wrangler.jsonc`. Sempre
informe `--env staging` nos comandos remotos. Se o comando não contém esse
ambiente, pare e confira antes de executá-lo.

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
npx wrangler deploy --env staging --dry-run
```

Para publicação, migration remota, segredo remoto ou alteração no painel da
Meta, obtenha autorização explícita do proprietário na conversa atual.

## Preparar o Worker e o D1 de homologação

1. Confirme que o D1 de `staging` é um banco separado e vazio ou conhecido.
2. Aplique migrations somente com `--env staging` e `--remote`.
3. Cadastre os três segredos exclusivamente no Worker de `staging`:
   `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN` e
   `WHATSAPP_APP_SECRET`.
4. Publique somente após as verificações locais aprovadas.
5. Confirme, sem expor valores, que a rota `/health` responde e que
   `/privacy` está pública. A URL de política é requisito para publicar o app
   de homologação na Meta.

Nunca use `wrangler secret list` para tentar obter valores: ele só confirma
nomes. Nunca cole token, App Secret, assinatura, telefone ou payload real em
Git, documentação, terminal gravado ou chat.

## Configurar o app isolado na Meta

No app de homologação, abra **Casos de uso → Conectar no WhatsApp**.

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
2. Confirme que existe um número de teste e anote separadamente, em local
   seguro, a identificação da conta de mensagens exibida nessa tela. Não use a
   identificação de outra conta da Etapa 2 por engano.
3. Clique em **Gerar token** e limite a permissão à conta de teste atual.
4. Transfira o token imediatamente ao segredo
   `WHATSAPP_ACCESS_TOKEN` do Worker de `staging` por canal protegido.
5. Limpe qualquer cópia temporária da área de transferência.
6. Adicione e selecione apenas um destinatário de teste autorizado. Esse
   telefone é o participante humano do piloto, não um cliente real.

Tokens gerados nesta tela são temporários. Sempre que gerar outro, atualize o
segredo de `staging` antes de esperar respostas automáticas do Worker.

## Passo obrigatório: inscrever a conta de mensagens no app

Faça este passo para **cada** conta de mensagens usada no piloto, inclusive a
conta criada automaticamente para o número de teste.

O token precisa ter permissões de gerenciamento e mensagens do WhatsApp para a
conta usada. Digite-o de forma silenciosa no terminal; não o cole no comando e
não habilite `set -x`.

```sh
read -r WHATSAPP_WABA_ID
read -rs WHATSAPP_ACCESS_TOKEN
printf '\n'
read -r WHATSAPP_GRAPH_API_VERSION

curl --fail-with-body --silent --show-error --request POST \
  --header "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}" \
  "https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${WHATSAPP_WABA_ID}/subscribed_apps"

unset WHATSAPP_ACCESS_TOKEN WHATSAPP_WABA_ID WHATSAPP_GRAPH_API_VERSION
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

### Limitação observada após migrar um destinatário para WhatsApp Business

Durante este piloto, um número pessoal usado como destinatário foi migrado para
o WhatsApp Business. Depois disso, ele continuou aparecendo no painel da Meta,
mas a Cloud API passou a recusar respostas automáticas com o código `131030`.
Remover e adicionar novamente o destinatário, gerar token novo e atualizar o
segredo de `staging` não resolveu de imediato; um envio-controlado fora do
Worker reproduziu o mesmo resultado.

Portanto, não trate a migração para WhatsApp Business como requisito para ser
destinatário de sandbox. Para essa finalidade, um WhatsApp comum já basta. Se o
problema persistir após tempo de propagação, use outro telefone existente apenas
como destinatário de teste ou crie uma configuração de teste nova. Não registre
o número pessoal no fluxo tradicional da Etapa 2 para tentar contornar o erro.

## Ensaio ponta a ponta

### 1. Validar saída

Na Etapa 1, selecione o destinatário autorizado e envie apenas o modelo padrão
oferecido pela Meta. Confirme no WhatsApp que ele chegou.

### 2. Observar sem registrar dados sensíveis

Em outro terminal, inicie a observação operacional:

```sh
npx wrangler tail atendente-whatsapp-staging --format pretty
```

Não faça a verificação `GET /webhook` enquanto o tail estiver aberto: URLs de
verificação carregam o token como query string e podem aparecer na observação.
Use o tail somente enquanto o participante envia uma mensagem de teste, como
`oi`.

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
    (SELECT COUNT(*) FROM appointments) AS reservas;"
```

Após a primeira saudação, espere ao menos uma conversa e uma mensagem
processada. A tabela `customers` não é critério neste incremento: ela ainda não
é preenchida pelo repositório de conversa.

### 4. Validar a jornada

No mesmo WhatsApp, percorra uma conversa curta da barbearia: saudação,
consulta de serviços, escolha de serviço e confirmação de horário. Reenvie a
confirmação para comprovar que uma reserva não duplica. Esse comportamento
continua coberto por testes automatizados; o piloto confirma transporte,
credenciais e persistência remota.

## Diagnóstico rápido

| Sintoma | Causa mais provável | Ação segura |
| --- | --- | --- |
| A Meta não salva callback | URL sem HTTPS, rota diferente de `/webhook` ou token diferente | Testar o `GET /webhook` fora do tail; conferir os dois campos manualmente sem mostrar o token |
| Modelo padrão não chega | destinatário não autorizado ou token temporário expirado | Autorizar o destinatário na Etapa 1, gerar token novo e atualizar apenas o segredo de `staging` |
| Modelo chega, mas `oi` não chega ao Worker | conta de mensagens não inscrita no app | Executar o `POST .../subscribed_apps` para a conta da Etapa 1 e repetir o ensaio |
| Worker retorna `webhook_signature_rejected` | App Secret do app de homologação não corresponde ao segredo de `staging` | Revelar o segredo somente no painel da Meta e substituir apenas o segredo remoto de `staging` |
| Evento aparece como `webhook_ignored` | evento de status, não mensagem recebida | É esperado para status de entrega; repetir com uma mensagem humana de texto |
| D1 registra conversa, mas não há resposta e a Meta retorna `131030` | a API não reconhece o destinatário na lista do número de teste | Renovar a autorização, aguardar propagação e repetir um envio-controlado; se persistir, usar outro destinatário de teste ou ambiente de teste novo |
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
- registros aparecem somente no D1 de `staging`;
- nenhum segredo, telefone, texto ou payload completo aparece nos logs.

Para interromper o experimento, remova a inscrição da conta de teste ou retire
o callback no app de homologação. Não altere o app, o Worker, o D1 ou o número
de produção como forma de encerrar um piloto.
