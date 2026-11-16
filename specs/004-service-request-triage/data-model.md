# Modelo de dados

## Perfil de negócio

- identificador estável, nome e serviços;
- modo `appointment` ou `request`;
- perguntas de triagem, cada uma com identificador, rótulo e respostas aceitas.

## Solicitação de serviço

- identificador, negócio, cliente e serviço;
- respostas de triagem em formato estruturado;
- status inicial `pending`;
- momento de criação.

Os valores coletados são necessários somente para a avaliação inicial. Eles não
devem aparecer em logs operacionais.
