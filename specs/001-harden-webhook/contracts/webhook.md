# Contrato HTTP: webhook da Meta

## `GET /webhook`

Fora do escopo deste hardening. O contrato de desafio existente permanece sem
alteração.

## `POST /webhook`

### Requisição autenticada

- Método: `POST`
- Cabeçalho obrigatório: `X-Hub-Signature-256: sha256=<digest hexadecimal>`
- Corpo: bytes JSON assinados pela Meta usando o App Secret.

O digest informado deve corresponder ao HMAC SHA-256 do corpo bruto. A requisição
é verificada antes de o JSON ser interpretado.

### Respostas

| Condição | Status | Corpo | Efeito |
| --- | --- | --- | --- |
| Assinatura válida e JSON aceito | 200 | `EVENT_RECEIVED` | Preserva o processamento atual em segundo plano |
| Assinatura ausente, malformada ou inválida | 401 | resposta genérica de não autorizado | Não interpreta o JSON, não responde mensagens |
| Assinatura válida e JSON inválido | 400 | `BAD_REQUEST` | Não processa mensagens |

### Compatibilidade

Para requisições autenticadas que já eram válidas, o status, corpo de confirmação,
extração de mensagens de texto e resposta assíncrona permanecem inalterados.
