# Validação local completa

Este roteiro nunca chama a Meta, não abre tunnel e não acessa D1 remoto. Ele
usa o Worker, D1 e uma simulação da Cloud API, todos em `127.0.0.1`.

## Preparação única

1. Aplique a migration local e mantenha a mesma pasta de persistência:

   ```sh
   npx wrangler d1 migrations apply DB --local --persist-to .wrangler/state
   ```

2. Em `.dev.vars`, configure o endereço do mock abaixo. Garanta que
   `WHATSAPP_PHONE_NUMBER_ID` esteja definido para o número do Worker local.
   Os testes usam esse valor nos metadados dos webhooks simulados. Mantenha
   credenciais e o arquivo fora do Git:

   ```text
   WHATSAPP_GRAPH_API_BASE_URL=http://127.0.0.1:8788
   ```

3. Atualize os tipos, pois Wrangler também lê os nomes de bindings locais:

   ```sh
   npm run cf-typegen
   npm run cf-typegen -- --check
   ```

4. Confirme a base estática antes de iniciar processos locais:

   ```sh
   npm run typecheck
   npm test
   ```

## Execução

Abra três terminais no diretório do projeto.

No primeiro, inicie a simulação da Cloud API:

```sh
npm run mock:graph
```

No segundo, inicie o Worker e D1 locais:

```sh
npm run dev -- --local --persist-to .wrangler/state --port 8787
```

No terceiro, execute a jornada completa:

```sh
npm run smoke:local
```

O smoke test envia seis eventos fictícios e assinados, percorre serviço, data,
horário e confirmação, e reenvia a confirmação para validar deduplicação. Ele
não mostra nem envia dados reais de cliente e falha se a URL do mock não for
local.

Confira a persistência no mesmo terceiro terminal:

```sh
npx wrangler d1 execute DB --local --persist-to .wrangler/state --command "SELECT (SELECT COUNT(*) FROM conversations) AS conversations, (SELECT COUNT(*) FROM appointments WHERE status = 'confirmed') AS confirmed_appointments, (SELECT COUNT(*) FROM processed_messages) AS processed_messages;"
```

O resultado esperado é uma conversa, uma reserva confirmada e seis mensagens
processadas. Como o estado fica em `.wrangler/state`, pare e reinicie o Worker
para verificar que a reserva permanece.

## Triagem de piscina e jardinagem

Para validar uma solicitação em vez de uma reserva, use uma pasta local nova,
aplique as migrations e inicie o Worker com o perfil escolhido. O mock continua
o mesmo e nunca chama a Meta:

```sh
npx wrangler d1 migrations apply DB --local --persist-to .wrangler/request-state
npm run dev -- --local --persist-to .wrangler/request-state --var BUSINESS_PROFILE:pool --port 8787
```

Em outro terminal, execute:

```sh
LOCAL_REQUEST_PROFILE=pool npm run smoke:requests
```

Troque `pool` por `gardening` nos dois comandos para validar corte de grama e
jardinagem. Ao fim de cada cenário, uma solicitação pendente deve existir e
nenhuma reserva automática deve ter sido criada:

```sh
npx wrangler d1 execute DB --local --persist-to .wrangler/request-state --command "SELECT (SELECT COUNT(*) FROM service_requests WHERE status = 'pending') AS pending_requests, (SELECT COUNT(*) FROM appointments) AS appointments;"
```

## Limites

Este roteiro valida a aplicação localmente. Ele não comprova callback público,
permissões, token, janela de atendimento ou entrega real da Meta. Essas etapas
só começam em um ambiente remoto de teste isolado, após autorização explícita.
