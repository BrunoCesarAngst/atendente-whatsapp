# Plano: triagem configurável de serviços

**Spec**: [spec.md](./spec.md)

## Resumo

Adicionar um perfil de negócio selecionável localmente. O perfil de agenda usa
o motor de reserva existente; os perfis de piscina e jardinagem usam um motor
determinístico de triagem que persiste solicitação pendente e pausa a automação.

## Decisões técnicas

- Manter um único Worker, webhook, assinatura e resposta `EVENT_RECEIVED`.
- Não adicionar pacote de produção: o domínio continua em TypeScript e D1.
- Criar contrato de perfil de negócio e três fixtures administradas no código.
- Adicionar tabela de solicitações em migration nova e métodos equivalentes no
  repositório D1 e em memória.
- Selecionar o perfil por variável não sensível de ambiente, com barbearia como
  padrão seguro para preservar o comportamento atual.
- Usar respostas textuais, botões e listas já existentes; não adicionar IA,
  templates, painel nem integração de notificação.

## Estratégia de teste

1. Testes unitários para cada roteiro e para deduplicação de solicitação.
2. Testes de integração HTTP para seleção de perfil e transição a modo humano.
3. Extensão do smoke test local para verificar D1 real com mock da Cloud API.
4. `npm run typecheck`, `npm test`, migration local e `git diff --check`.

## Estrutura prevista

```text
src/
├── businesses/                 # perfis e contrato configurável
├── conversation/               # seleção de jornada e triagem
├── persistence/                # portas, memória e D1
└── whatsapp/                   # apenas contratos e Cloud API
tests/
├── unit/                       # regras de jornada e persistência
└── integration/                # webhook completo com dependências simuladas
```
