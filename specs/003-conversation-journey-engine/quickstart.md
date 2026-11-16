# Validação rápida

## Pré-requisitos

- Dependências instaladas pelo lockfile.
- Segredos locais em `.dev.vars`, nunca em comandos ou fixtures.
- D1 local configurado somente após a fase de persistência.

## Validações

```sh
npm test
npx tsc --noEmit
npm run cf-typegen
npm run deploy -- --dry-run
```

O dry-run compila e valida o pacote; não autoriza publicação, migração remota ou
alteração de secrets.

## Cenários

1. Evento assinado válido recebe `EVENT_RECEIVED`; evento inválido recebe rejeição
   antes do parser.
2. `oi` retorna opções de início; preço retorna resposta direta; escolhas usam IDs.
3. A mesma mensagem entregue duas vezes não duplica estado ou reserva.
4. Dois clientes disputando o mesmo horário obtêm no máximo uma confirmação.
5. Handoff suspende automação; ausência de IA ou Flow mantém a jornada funcional.
