# Pesquisa: jornada persistida

## Decisão: usar Cloudflare D1

**Decisão:** Usar D1 para conversas e reservas, com migração SQL, consultas
parametrizadas e uma restrição única no horário confirmado.

**Racional:** D1 se integra ao Worker por binding tipado e suporta transações em
batch. Índices únicos impõem unicidade, o que protege a confirmação concorrente de
um horário sem adicionar um serviço separado.

**Alternativas consideradas:**

- KV — rejeitado: não é adequado para confirmação transacional de horários.
- Durable Objects — rejeitado: é mais complexo que o necessário para uma única
  agenda inicial.
- Estado na memória — rejeitado: não sobrevive entre requisições.

Referências: [D1 Worker Binding API](https://developers.cloudflare.com/d1/worker-api/), [D1 batch transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/), [índices únicos no D1](https://developers.cloudflare.com/d1/best-practices/use-indexes/).

## Decisão: resposta como contrato de domínio

**Decisão:** O motor retorna `text`, `buttons` ou `list` com IDs estáveis. O
adaptador WhatsApp transforma esse contrato no payload da Cloud API e converte
respostas interativas de volta ao ID de ação.

## Decisão: reserva idempotente

**Decisão:** Guardar o identificador da mensagem recebida e tratar repetição como
nenhuma nova transição. A confirmação tenta inserir a reserva em transação; conflito
de unicidade produz uma resposta para escolher outro horário.
