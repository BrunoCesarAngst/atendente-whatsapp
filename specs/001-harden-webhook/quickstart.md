# Validação rápida

## Pré-requisitos

- Dependências instaladas com o lockfile do repositório.
- Node.js 22 ou versão compatível com o script de testes definido no pacote.
- Segredos locais configurados em `.dev.vars`, incluindo o App Secret da Meta; não
  colocar valores em comandos, fixtures ou documentação.

## Sincronizar tipos de bindings

```sh
npm run cf-typegen
```

Resultado esperado: o arquivo de tipos gerado reflete as variáveis públicas de
`wrangler.jsonc`; a tipagem local complementa somente os nomes de secrets.

## Rodar validações

```sh
npm test
```

Resultado esperado: todos os testes de parsing e assinatura passam. A tipagem do
Worker usa as definições atualizadas geradas pelo Wrangler.

## Cenários de aceite

1. Envie um corpo JSON assinado com o App Secret e cabeçalho
   `X-Hub-Signature-256`; espere `200 EVENT_RECEIVED`.
2. Reenvie o mesmo corpo sem cabeçalho, com digest malformado e com digest de outro
   corpo; espere `401` em todos os casos, sem processamento posterior.
3. Envie JSON inválido com assinatura válida para os bytes enviados; espere
   `400 BAD_REQUEST`.
4. Revise logs do ambiente de produção e confirme que há categorias operacionais,
   mas nenhum corpo, texto, telefone, identificador externo ou segredo.

Não publique o Worker durante esta validação sem pedido explícito do proprietário.
