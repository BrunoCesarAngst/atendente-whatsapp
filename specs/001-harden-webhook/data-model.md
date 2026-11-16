# Modelo de dados

## Evento recebido autenticado

Representa o corpo original do webhook depois de a assinatura ter sido aprovada.

| Campo | Regra |
| --- | --- |
| corpo bruto | obrigatório; usado uma única vez para verificar a assinatura e então interpretar o JSON |
| assinatura recebida | obrigatória; prefixo literal `sha256=` e digest hexadecimal SHA-256 de tamanho válido |
| resultado | `valid`, `missing`, `malformed` ou `mismatch` |

Transições: `received` → `verified` → `parsed` → `acknowledged` →
`responded-asynchronously`. Um evento inválido segue `received` → `rejected` e não
alcança parsing nem envio.

## Mensagem de texto recebida

Representa a mensagem já extraída de um evento autenticado.

| Campo | Regra |
| --- | --- |
| remetente | obrigatório para extração; dado pessoal, não registrar em produção |
| identificador da mensagem | obrigatório para extração; identificador externo, não registrar em produção |
| texto | obrigatório para extração; conteúdo pessoal, não registrar em produção |

Não existe persistência para esta entidade.

## Evento operacional seguro

Representa um log de diagnóstico permitido em produção.

| Campo | Regra |
| --- | --- |
| nome | obrigatório; categoria fixa de operação |
| resultado | obrigatório; sucesso, rejeição ou falha |
| motivo seguro | opcional; somente categoria, jamais conteúdo externo |

Não pode conter corpo, mensagem, telefone, identificador externo, token, App Secret
ou cabeçalho de autorização.
