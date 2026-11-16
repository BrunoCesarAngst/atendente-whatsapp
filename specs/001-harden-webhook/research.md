# Pesquisa técnica: Hardening do Webhook

## Decisão: validar o corpo bruto com Web Crypto nativo

**Decisão:** Ler uma única vez os bytes originais da requisição, verificar o HMAC
SHA-256 indicado por `X-Hub-Signature-256` antes de converter o conteúdo para JSON
e só então entregar o texto ao parser.

**Racional:** Um HMAC é calculado sobre bytes. Converter JSON antes da verificação
ou reserializá-lo pode alterar os bytes e invalidar uma assinatura legítima. O
runtime Worker disponibiliza Web Crypto nativamente, incluindo HMAC e SHA-256,
sem habilitar compatibilidade Node.

**Alternativas consideradas:**

- Verificar um JSON reserializado — rejeitada, pois não preserva a representação
  assinada.
- Usar `node:crypto` — rejeitada, pois Web Crypto já cobre o requisito sem
  compatibilidade adicional.
- Usar biblioteca de HMAC — rejeitada, pois criaria dependência sem necessidade.

Referências: [Web Crypto no Cloudflare Workers](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/), [assinar e verificar HMAC em Workers](https://developers.cloudflare.com/workers/examples/signing-requests/).

## Decisão: rejeitar assinatura inválida sem vazar detalhes

**Decisão:** Exigir o cabeçalho `X-Hub-Signature-256` no formato
`sha256=<digest hexadecimal>` e retornar não autorizado para cabeçalho ausente,
malformado ou incompatível. A comparação ocorre entre buffers do mesmo tamanho em
operação resistente a timing.

**Racional:** Respostas uniformes evitam revelar se a falha foi ausência, formato
ou conteúdo de assinatura, enquanto a comparação resistente a timing limita canais
laterais evitáveis.

**Alternativas consideradas:**

- Aceitar cabeçalho sem prefixo — rejeitada, pois o contrato da feature exige o
  prefixo explícito.
- Comparar strings diretamente — rejeitada por não oferecer as mesmas garantias.

Referência: [boas práticas de Workers](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

## Decisão: logs por categoria, não por conteúdo

**Decisão:** Registrar somente nome do evento operacional, resultado e categoria
segura de erro. Não registrar corpo, texto, telefone, ID externo, segredo ou
cabeçalhos de autorização em produção.

**Racional:** Esses campos não são necessários para distinguir assinatura
rejeitada, corpo inválido, evento sem texto e falha de envio. A redução evita
exposição de dados pessoais no provedor de observabilidade.

## Decisão: testes unitários sem dependência adicional

**Decisão:** Usar o executor de testes nativo do Node 22 para helpers TypeScript
puros, com script explícito que habilite a remoção de tipos. Os testes não importam
o handler Hono nem fazem requisições externas.

**Racional:** O parsing e a verificação são determinísticos e não exigem emulação
do runtime. Isso satisfaz a cobertura solicitada sem instalar framework de testes.

**Alternativas consideradas:**

- Adicionar Vitest ou emulador de Worker — rejeitada por aumentar dependências para
  testes que podem ser unitários.
- Sem testes automatizados — rejeitada pelo requisito da feature.

## Decisão: Wrangler gera a base dos tipos de bindings

**Decisão:** Executar `npm run cf-typegen` e versionar o arquivo gerado. Usar o
tipo `CloudflareBindings` gerado para valores declarados em `wrangler.jsonc` e
complementá-lo localmente somente com os nomes de secrets, que não podem ser
declarados com valores no arquivo de configuração.

**Racional:** A configuração pública e seu tipo permanecem sincronizados, sem
forçar segredos a aparecerem no repositório.

**Alternativas consideradas:**

- Manter todos os bindings duplicados manualmente — rejeitada por risco de drift.
- Declarar secrets em `wrangler.jsonc` para gerar tipos — rejeitada por violar a
  política de segredos.
