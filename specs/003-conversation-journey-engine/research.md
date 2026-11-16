# Pesquisa técnica

## Decisão: hardening antes de estado persistente

**Decisão:** validar HMAC SHA-256 sobre os bytes brutos, reduzir logs e deduplicar
antes de processar a conversa.

**Racional:** eventos não autenticados ou reentregues não podem alterar conversa,
handoff ou agenda.

**Alternativas consideradas:** persistir primeiro foi rejeitado, pois amplia a
superfície de efeitos de um webhook ainda não autenticado.

## Decisão: D1 com statements parametrizados e constraints

**Decisão:** usar D1 para conversas, deduplicação e reservas; confirmar reserva e
registrar a mensagem na mesma transação.

**Racional:** uma constraint única de horário confirmado resolve concorrência sem
adicionar serviço de coordenação.

**Alternativas consideradas:** KV e memória não oferecem confirmação transacional;
Durable Objects excedem a complexidade da primeira versão.

## Decisão: resposta intermediária

**Decisão:** jornadas retornam `text`, `buttons`, `list` ou `flow`, sem importar
o cliente Graph API.

**Racional:** a experiência e as regras ficam testáveis sem formato externo; o
renderer é o único responsável por payloads oficiais atualizados.

## Decisão: IA interpretativa e opcional

**Decisão:** `IntentInterpreter` retorna uma interpretação validada ou `null`.

**Racional:** disponibilidade, preço, reserva e autorização continuam sendo
decisões determinísticas. Sem configuração ou confiança suficiente, a jornada usa
parser determinístico e escolhas estruturadas.

## Decisão: Flows opcionais

**Decisão:** preparar `FlowResponse`, mas não exigir `flowId` para agendamento.

**Racional:** botões e listas resolvem a primeira jornada; Flow pode substituir
coletas longas futuramente sem mudar o domínio.
