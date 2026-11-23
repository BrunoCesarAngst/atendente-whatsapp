# Acompanhamento do AtendenteG em homologação

Use `npm run logs:staging` em um terminal do projeto com Node.js 22, dependências
instaladas, `jq` e Wrangler autenticado na Cloudflare. Deixe o terminal aberto
durante os testes. Use Ctrl+C para encerrar a sessão.

Confira a branch do diretório onde executou o npm. Se aparecer
`Missing script: "logs:staging"`, use uma cópia atualizada de `staging`
com o monitor. A partir de outro diretório, rode
`npm --prefix /caminho/da/copia-de-staging run logs:staging`.
Isso permite acompanhar os logs enquanto a branch de trabalho contém
outras alterações.

## Ler o que aconteceu

Cada linha mostra o horário de Brasília, o resultado, o evento, um rastro
aleatório do webhook e os detalhes que se aplicam. A posição indica qual
mensagem do webhook está em andamento. O rastro ajuda a seguir as linhas de
uma invocação e muda a cada novo webhook, inclusive em uma reentrega.

| Evento | Como interpretar |
| --- | --- |
| Webhook recebido, assinatura validada, recebimento confirmado | A entrada chegou e o Worker confirmou que recebeu a mensagem. O trabalho da conversa continua em segundo plano. |
| Estado gravado e passo da conversa | Mostra onde a conversa ficou, como catálogo, seleção de data ou confirmação. |
| Reserva confirmada, conflito ou triagem registrada | Indica o resultado da tentativa no repositório. O evento de gravação pode preceder uma falha de envio. |
| Relatório consultado, referência atualizada ou custo-hora atualizado | A operação do responsável foi executada para a agenda. Os valores do relatório ficam na conversa. |
| Envio aceito pela Meta | A API aceitou o envio. Para comprovar entrega, confira o celular. |
| Falha no envio à Meta | Use HTTP, código e subcódigo para investigar o erro. Um erro de transporte pode aparecer como falha de processamento na etapa envio. |
| Mensagem repetida ignorada ou conversa sob atendimento humano | O fluxo encerrou a automação por deduplicação ou porque a conversa já está em atendimento humano. |
| Número empresarial sem rota configurada | O webhook foi recebido, mas esse número ficou fora do processamento. Esse evento está disponível na entrega de roteamento por empresa. |
| Processamento encerrado | Mostra a duração total do trabalho e o resultado do webhook. |

Para observar um ciclo completo, mande `oi` ao número de teste e inicie um
agendamento. Se quiser seguir a medição de valor, envie `/valor` a partir do
telefone autorizado. Compare a sequência com o
[roteiro de homologação](HOMOLOGACAO_META.md).

## Privacidade e limites

O comando acompanha somente invocações por POST do Worker de `staging` e
apresenta uma lista permitida de eventos e campos estruturados. URLs, corpos,
cabeçalhos, segredos, telefones, IDs de clientes e mensagens ficam fora da
saída. Os logs automáticos de invocação ficam desativados em `staging`.
Use o comando filtrado para o teste. O `wrangler tail` bruto pode incluir
metadados de requisição.

O feed ao vivo é disponibilizado pela Cloudflare por invocação e pode sofrer
amostragem em alto volume. Para consultar eventos operacionais posteriormente,
use Workers Logs no painel do Worker de homologação. O D1 continua sendo a
fonte de verdade para reservas e medições.

Referência: [Logs em tempo real de Workers](https://developers.cloudflare.com/workers/observability/logs/real-time-logs/).
