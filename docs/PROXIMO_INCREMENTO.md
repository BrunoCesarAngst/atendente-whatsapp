# AtendenteG para barbearias e salões

**Ponto de partida:** interoperabilidade do WhatsApp e primeira reserva já
validadas em homologação. A primeira entrega deste plano adiciona a medição
de valor à agenda existente.

**Resultado do pacote:** o cliente pergunta, agenda, remarca e cancela no
WhatsApp do estabelecimento. O responsável consulta e bloqueia horários,
recebe as exceções e acompanha o valor gerado pelo mesmo canal. O AtendenteG
usa o mesmo código para as empresas e mantém os dados isolados por negócio.

O primeiro recorte comercial são barbearias e salões com serviços de preço
e duração definidos. Outros pacotes poderão reutilizar a entrada por texto
ou áudio, a configuração por empresa, a intervenção humana e as métricas.
Restaurantes precisarão de regras próprias de pedido e entrega. Prestadores
que orçam depois de avaliar precisam de métricas de triagem assistida.

## Como trabalhar neste plano

1. Leia [AGENTS.md](../AGENTS.md), o [fluxo Git](WORKFLOW_GIT.md) e o
   [estado atual](ESTADO_ATUAL.md). Comece cada entrega em uma branch
   `codex/<mudança>` a partir de `origin/staging`.
2. Para cada entrega, escreva primeiro o teste do critério de aceite. Rode
   `npm run typecheck` e `npm test`. Use D1 local e Graph API simulada para
   os fluxos que envolvem estado ou envio.
3. Preserve a autenticação do webhook, a confirmação `EVENT_RECEIVED`,
   o processamento assíncrono e a compatibilidade com dados anteriores.
   Registre decisões de persistência, novos serviços e integrações em
   [DECISIONS.md](DECISIONS.md).
4. No PR para `staging`, registre o teste executado, o limite da entrega e
   qualquer migration prévia. Use somente dados fictícios em desenvolvimento.
   O uso da Meta ou D1 remotos e o deploy seguem o roteiro autorizado.

## Entrega 0 — Medir reservas e mostrar valor ao responsável

**Implementada e validada localmente.** A fonte é o D1.
Logs operacionais ajudam a investigar falhas, enquanto a reserva persistida
é o registro usado no relatório. Um reenvio da confirmação ou uma tentativa
com conflito não grava uma nova reserva e não aumenta a contagem.

### Uso pelo WhatsApp do estabelecimento

Os comandos são aceitos somente do identificador exato do responsável,
configurado no secret opcional `WHATSAPP_OWNER_ID`, em uma mensagem
autenticada enviada ao número empresarial daquele Worker. Use o valor
recebido pela Meta para o responsável. Preserve seu formato e mantenha-o
fora do Git, do chat de suporte e de logs.

| Mensagem | Resultado |
| --- | --- |
| `/calibrar 90 120 150` | Grava a mediana de três amostras de tempo ativo para as próximas reservas. São aceitos de 3 a 15 valores em segundos. |
| `/custo-hora 60,00` | Define a taxa opcional de referência em reais por hora. `/custo-hora 0` desativa a conversão em reais. |
| `/valor` | Mostra as reservas automáticas dos últimos 30 dias, a cobertura da calibração, o tempo estimado e a equivalência em reais quando configurada. |

Para calibrar, cronometre **só o tempo ativo da pessoa que atende** em alguns
agendamentos manuais reais. Some os momentos de ler, consultar horários,
digitar, confirmar e registrar. Exclua as pausas aguardando resposta e a
duração do serviço. Use situações comuns do negócio e repita a calibração
quando o processo manual mudar. A mediana reduz a influência de casos muito
longos. O D1 guarda a mediana e o número de amostras, sem guardar os áudios,
os textos das conversas ou os tempos individuais para essa medição.

### O que a medida representa

- **Reservas gravadas automaticamente** é uma contagem observada. Cada
  reserva nova gravada pelo fluxo do bot recebe o horário UTC da confirmação
  automática. A consulta filtra o negócio e os últimos 30 dias pela data da
  confirmação, mesmo que o serviço esteja marcado para outro dia.
- **Tempo poupado** é a soma das medianas aplicadas às reservas no momento
  em que foram gravadas. É uma estimativa de trabalho manual evitado. Uma
  nova calibração vale para as reservas seguintes. Reservas anteriores à
  migration ficam fora da contagem de automação. Reservas novas sem
  calibração aparecem na contagem, sem entrar na soma de tempo.
- **Equivalência em reais** é o tempo estimado multiplicado pelo custo-hora
  vigente na consulta. Representa capacidade de trabalho que pode ser
  reutilizada. Receita, lucro e economia de caixa exigem dados próprios.
- **Limite desta versão:** a reserva gravada comprova a conclusão no D1.
  A entrega da mensagem de confirmação e intervenções que ocorram mais
  tarde precisam de eventos próprios. O relatório desta entrega mede a
  etapa da reserva e ainda não calcula a taxa de autoatendimento geral.

Exemplo fictício. Se o bot gravar 32 reservas em 30 dias, 28 tiverem referência
de 4 minutos e o responsável informar R$ 60,00/h, o relatório mostra 32
reservas, cobertura de 28 de 32, **1 h 52 min estimados** e **R$ 112,00 de
equivalência de tempo**. As quatro reservas sem referência ficam visíveis.

### Validar e disponibilizar

1. Use [a validação local](LOCAL_VALIDATION.md) com D1 temporário. Aplique
   `0003_booking_impact.sql` com `wrangler d1 migrations apply DB --local`
   na mesma persistência do Worker. Configure um responsável fictício em
   `.dev.vars` do ambiente de teste e o mock local de Graph. Nos webhooks
   sintéticos, informe `metadata.phone_number_id` igual ao sender configurado.
2. Confirme uma reserva antes da calibração. Calibre e confirme uma segunda.
   Envie `/valor` pelo remetente autorizado e compare a contagem, a cobertura
   e a soma. Reenvie o mesmo ID de confirmação e reteste com um remetente
   comum e com outro número empresarial. Esses casos estão cobertos no
   teste de integração com SQLite, webhook assinado e Graph simulada.
3. Para homologar, obtenha autorização para aplicar a migration ao D1 de
   `staging` **antes de ativar a versão do Worker**. Configure
   `WHATSAPP_OWNER_ID` como secret de homologação com o mesmo processo de
   autorização de uma atualização de versão. Revalide agenda e relatório
   pelo celular. Sem o secret, o atendimento público segue disponível e a
   consulta de valor permanece restrita.

## Entrega 1 — Separar dois estabelecimentos fictícios

**Roteamento, reservas e relatórios validados localmente.** O Worker usa
`metadata.phone_number_id` para selecionar o perfil e responder pelo mesmo
número empresarial. Os testes de integração validam catálogos diferentes,
duas reservas no mesmo horário para o mesmo cliente fictício e o acesso
de cada responsável ao relatório da própria empresa.

Para a simulação local, use o mock da Graph API e configure em `.dev.vars`
`WHATSAPP_BUSINESS_PROFILES={"barbearia-teste":"barbershop","salao-teste":"salon"}`.
Cada chave é um ID de remetente. Cada perfil configurado deve ter um ID de
negócio distinto. Use `npm test` para repetir o ensaio com os dois números.
O piloto com um número usa `WHATSAPP_PHONE_NUMBER_ID` e `BUSINESS_PROFILE`
quando o mapa está ausente. O mock usa uma credencial fictícia compartilhada.
Configure também `WHATSAPP_OWNER_IDS={"barbearia-teste":"responsavel-barbearia","salao-teste":"responsavel-salao"}`
em `.dev.vars` para o teste. Em ambiente remoto, trate esse mapa como
secret. Quando o mapa é fornecido, ele define todos os responsáveis.
O Worker com um único número continua usando `WHATSAPP_OWNER_ID` na ausência
do mapa. Um mapa inválido bloqueia os comandos do responsável e mantém
o atendimento público. Credenciais individuais da Meta ainda fazem parte
da ativação de empresas reais.

Implemente cadastro e resolução do negócio a partir de
`metadata.phone_number_id` de webhooks autenticados. Cada negócio tem ID,
catálogo, fuso, horários, credenciais protegidas e responsáveis autorizados.
Use IDs e números de canal fictícios nos testes. Preserve os dados do
negócio único existente ao migrar.

**Teste:** envie eventos de dois números empresariais para o mesmo Worker.
Use a mesma pessoa fictícia e o mesmo horário em ambos. Compare catálogo,
agenda e relatório. Mantenha isolados estado, reservas, parâmetros de
medição e comandos do responsável. Eventos de canal desconhecido ficam fora
do processamento de negócio. Trocar uma configuração de teste exige
preencher dados, com o mesmo código nos dois estabelecimentos.

## Entrega 2 — Fechar a agenda em fatias

1. **Disponibilidade:** valide fuso, expediente, duração e bloqueios.
   Garanta no D1 que duas confirmações concorrentes em intervalos
   sobrepostos do mesmo profissional só produzem uma reserva.
2. **Remarcação:** reserve o novo horário e libere o anterior de forma
   atômica. Se outro cliente ocupar o novo horário, preserve a reserva atual
   e ofereça alternativas. Proteja a operação com a identidade da pessoa
   que fez a reserva e deduplicação do evento.
3. **Cancelamento:** mostre o horário atual, peça confirmação e libere
   a disponibilidade uma única vez. Mantenha o resultado histórico da
   automação e trate o cancelamento como uma nova ação.

**Teste de conclusão:** uma pessoa agenda, remarca e cancela no WhatsApp,
sem intervenção do responsável. Outra pessoa só vê os intervalos livres.
Teste falha parcial, reentrega, conflito e mudança de fuso em dados fictícios.

## Entrega 3 — Operar e assumir pelo WhatsApp

1. Adicione consulta da agenda do dia para o responsável autenticado. Inclua
   nessa resposta um resumo de reservas automáticas e tempo estimado, com
   acesso a `/valor` para ver a cobertura e a equivalência detalhadas.
2. Adicione bloqueio e desbloqueio por botão, confirmando profissional, dia
   e intervalo antes de gravar. Proteja o histórico de reservas existentes.
3. Disponibilize **Falar com uma pessoa**. Persista o encaminhamento e
   entregue ao responsável somente o contexto necessário. Na tomada de
   atendimento, pause a automação da conversa até a retomada explícita.

**Teste:** um número sem autorização não vê a agenda nem cria bloqueios.
O bloqueio remove o intervalo da disponibilidade. O cliente que pede uma
pessoa é encaminhado uma vez e sua conversa fica disponível após a retomada.
Use [a política de mensagens](https://whatsappbusiness.com/policy/) ao
implementar os avisos e o caminho de escalonamento.

## Entrega 4 — Entender texto livre e áudio

1. **Texto:** reconheça perguntas sobre preço, horário, duração e localização
   a partir do cadastro do negócio. Extraia a intenção de agendar, remarcar
   ou cancelar. Use a agenda e as transições da Entrega 2 para realizar
   ações. Quando faltar um dado, peça apenas o necessário.
2. **Áudio:** receba o ID de mídia pelo webhook autenticado, baixe o áudio
   pela [API da Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media)
   e transcreva em português com um provedor escolhido em decisão separada.
   Passe a transcrição pela mesma entrada de texto. Defina limites de
   duração, bytes e prazo de processamento. Minimize retenção e registre
   apenas códigos de falha. Comece respondendo por texto e botões.

**Teste:** texto e áudio equivalentes chegam à mesma intenção. Áudio
incompreensível, dados incompletos ou indisponibilidade da transcrição
retornam uma pergunta curta ou opção de digitar. Conteúdo de texto e áudio
não concede permissões de administrador. Uma ação que muda a agenda
exige confirmação explícita da pessoa.

## Entrega 5 — Medir autonomia de atendimento

1. Defina um atendimento por objetivo iniciado, com chave de idempotência.
   Registre tipos de resultado em separado. Use categorias de consulta,
   reserva, remarcação, cancelamento e encaminhamento, com horário, negócio
   e canal `texto` ou `áudio`.
2. Correlacione os estados da Meta quando precisar distinguir resposta
   aceita de resposta entregue. Registre intervenção humana como resultado
   observável, e conclusão assistida de forma separada. Após um prazo
   definido, conte fluxos sem conclusão como abandonados. A taxa de
   autonomia usa os atendimentos encerrados do período como denominador,
   com os abandonos e as exceções discriminados.
3. Calibre tempo manual por tipo de tarefa, informe cobertura e mantenha as
   referências históricas. Se houver medição de correções humanas, exiba o
   trabalho evitado e o tempo de correção separadamente antes de divulgar
   uma estimativa líquida. Envie resumo periódico somente após o dono
   pedir essa função e após validar templates, opt-in, janela e cobrança.

**Teste:** uma falha de entrega, um abandono e um caso assumido por uma
pessoa produzem resultados distintos. Reentrega não duplica contagens.
O responsável consegue explicar no WhatsApp como o valor foi calculado.

## Entrega 6 — Vender e ativar pelo canal comercial

1. No WhatsApp comercial do AtendenteG, mostre a demonstração, o plano e a
   proposta. Registre o aceite e explique a ativação antes de cobrar.
2. Colete a configuração inicial pelo WhatsApp. O responsável precisa
   autorizar os ativos de sua empresa na interface oficial da Meta.
   Valide permissões, revisão e coexistência antes de mexer no número
   comercial de um cliente.
3. Libere a ativação após confirmação do processador de pagamento. Valide
   a assinatura e idempotência do callback. Confirme o recebimento na
   conversa e mantenha tokens, dados de cartão e segredos fora dela.

**Teste:** aceite, pagamento e ativação avançam como estados distintos.
Pagamento pendente, falha de autorização e callback repetido são
recuperáveis sem cobrar ou ativar duas vezes. Cronometre o trabalho manual
de implantação e de suporte para confrontar com o valor da mensalidade.

## Quando testar com a primeira empresa

Use as duas empresas fictícias para validar isolamento antes de atender
negócios reais pelo mesmo Worker. Para o primeiro piloto, combine por
escrito as funções que serão testadas e valide a conexão do número
comercial com autorização própria. A oferta de agenda pode começar com
texto e botões. Valide áudio e contratação automatizada em entregas
próprias antes de incluí-los na oferta.

Combine uma meta de autonomia e um limite de esforço manual de ativação.
Registre a linha de base antes do início do piloto. Compare os resultados
observados e a disposição do responsável de continuar pagando.
