# Atendente WhatsApp

Worker de atendimento para negócios de serviço. O mesmo núcleo valida três
roteiros locais: agendamento de barbearia, solicitação de limpeza de piscina e
solicitação de corte de grama ou jardinagem.

## Garantias atuais

- webhook autenticado antes do processamento;
- resposta imediata à Meta e trabalho assíncrono;
- logs operacionais sem texto de cliente, telefone ou segredos;
- deduplicação de eventos;
- reserva automática somente para perfil de agenda;
- triagem pendente e modo humano para serviços que exigem avaliação.

## Verificação local

```sh
npm install
npm run typecheck
npm test
npm run cf-typegen -- --check
```

O roteiro completo com D1 local e Cloud API simulada está em
[docs/LOCAL_VALIDATION.md](docs/LOCAL_VALIDATION.md). Ele não chama Meta,
Cloudflare remoto ou produção.

O roteiro separado para validar a cadeia real com o número de teste da Meta
está em [docs/HOMOLOGACAO_META.md](docs/HOMOLOGACAO_META.md). Ele cobre o
callback, a inscrição da conta de mensagens, a verificação do número do
desenvolvedor como destinatário e a configuração da credencial de longa duração.
O ensaio ponta a ponta usa apenas o ambiente `staging`.

O estado consolidado, o histórico do piloto e o ponto exato de retomada estão
em [docs/ESTADO_ATUAL.md](docs/ESTADO_ATUAL.md).

## Publicação

Não execute deploy, migration remota ou alteração de secrets sem autorização
explícita do proprietário. Consulte `AGENTS.md` antes de alterar o projeto.
