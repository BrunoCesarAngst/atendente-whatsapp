# Desenvolvimento, homologação e produção

O fluxo do AtendenteG é **branch de trabalho → `staging` → `main`**.

| Branch | Uso | Ambiente |
| --- | --- | --- |
| `codex/<mudança>` | Mudança pequena, testada localmente e proposta por PR para `staging` | Worker, D1 e Graph API simulados |
| `staging` | Código candidato para o teste real com o WhatsApp do desenvolvedor | Worker `atendente-whatsapp-staging`, D1 e app Meta de homologação |
| `main` | Código aprovado para publicação | Worker de produção, após autorização explícita |

O GitHub Actions faz a validação em PRs para `staging` e `main` e nos pushes
para essas branches. O check **TypeScript e testes** usa Node.js 22, instala
com `npm ci` e roda `npm run typecheck` e `npm test`. A CI tem acesso de leitura
ao repositório, funciona sem segredos da Meta ou do Cloudflare e termina na
validação. Os deploys são manuais.

## Desenvolvimento e PR de homologação

1. Atualize as referências com `git fetch origin` e confirme a branch e o
   estado da cópia de trabalho. Parta de `origin/staging` para novas mudanças.
2. Crie uma branch curta, por exemplo
   `git switch -c codex/<mudança> origin/staging`, trocando `<mudança>` pelo
   nome da tarefa. Faça commits focados e com mensagem em português.
3. Rode os checks da CI no seu Mac e aplique o
   [roteiro local](LOCAL_VALIDATION.md) quando o comportamento do Worker mudar.
4. Abra o PR com base em `staging`. Descreva o que mudou e como foi validado.
   Aguarde **TypeScript e testes** passar antes do merge.

## Homologar a versão candidata

1. Após o merge, identifique o SHA de `origin/staging` a ser homologado e
   confirme o check desse commit. Use uma cópia limpa nesse SHA para empacotar
   e, quando autorizado, publicar.
2. Para uma alteração que precisa de teste remoto, rode o empacotamento sem
   publicação com `npx wrangler versions upload --env staging --dry-run`.
   Informe o SHA, o resultado das verificações, o alvo e o comando de deploy
   `npx wrangler deploy --env staging --minify`. Aguarde autorização explícita
   antes de executá-lo.
3. Siga o [roteiro da Meta](HOMOLOGACAO_META.md). Teste com o número pessoal
   do desenvolvedor como destinatário e registre o resultado e o SHA no PR
   de promoção. Documentação e CI podem ser homologadas pelos próprios checks.
4. Se tiverem entrado outras mudanças em `staging`, confirme a nova ponta
   antes de promover. Publique apenas o conjunto que foi aprovado.

## Promover para produção

O código-fonte, os testes e os guias podem seguir juntos pelo fluxo de PRs.
Os recursos ativos dependem do alvo do Wrangler e da configuração de cada
ambiente. O número de teste e o D1 de homologação pertencem a `env.staging`.
O alvo raiz usa o D1, o remetente e as credenciais de produção.

1. Abra um PR de `staging` para `main` com o SHA candidato e a evidência de
   validação. Use **Create a merge commit** nessa promoção para preservar
   a relação entre as duas branches. Mantenha `staging` após o merge.
2. A proteção de `main` exige PR e o check **TypeScript e testes** atualizado.
   Registre no PR a decisão do desenvolvedor sobre a promoção, os recursos
   de produção a conferir e a ordem das migrations pendentes. Confira
   o destino com `npx wrangler versions upload --env="" --dry-run --minify`.
   O dry run valida empacotamento e bindings declarados. Verifique o schema,
   a configuração da Meta e os segredos de produção em checagens próprias.
3. O merge deixa a versão disponível em `main`. Para publicar em produção,
   confirme o SHA, as verificações e o alvo raiz, informe o comando
   `npm run deploy -- --env=""` e aguarde a autorização prevista em
   [AGENTS.md](../AGENTS.md).
   Migrações remotas e troca de secrets também exigem autorização explícita.
4. Traga `main` de volta para `staging` quando a base tiver avançado. Com
   ambas sincronizadas e sem commits exclusivos em `staging`, avance-a por
   fast-forward. Se houve trabalho paralelo, abra um PR de `main` para
   `staging` e valide a integração. Preserve o histórico das duas branches.
