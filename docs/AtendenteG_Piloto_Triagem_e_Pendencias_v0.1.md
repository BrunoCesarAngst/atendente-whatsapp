# AtendenteG — Piloto de triagem e pendências

*Documento de ideia e validação | Versão 0.1 | 16 de outubro de 2026*

*Responsável: Bruno • Situação: proposta documentada; piloto ainda não validado*

> Transformar cada pedido em uma próxima ação clara e avisar o responsável apenas quando houver algo que dependa dele.

### 1. Ideia central

Criar um fluxo simples para receber pedidos de orçamento ou agendamento, identificar informações faltantes, organizar pendências e mostrar quem deve agir a seguir. A primeira experiência utiliza formulário, automação e planilha, sem inteligência artificial, painel próprio ou integração com WhatsApp.

O experimento pode servir à evolução do AtendenteG, preservando o Worker já existente como base de lógica própria. Essa vinculação considera o contexto do projeto; não significa que o código atual tenha sido auditado ou alterado para esta documentação.

### Problema e público — hipóteses a testar

Hipótese de dor: pequenos prestadores de serviço precisam reler pedidos, lembrar de retornos e decidir repetidamente o que fazer. Uma lista de contatos não resolve necessariamente essa dificuldade; o valor proposto está em explicitar a próxima ação, o responsável e a situação de cada solicitação.

Bruno será o primeiro operador e “cliente zero”, simulando também o solicitante. O comprador futuro seria um pequeno negócio com pedidos recorrentes e pouco tempo para acompanhamento. O nicho prioritário e a disposição a pagar permanecem em aberto.

### O que precisa ser provado

O piloto deve mostrar que o fluxo reduz esforço operacional, evita pendências esquecidas e torna a ação seguinte compreensível. Um teste individual demonstra funcionamento e utilidade pessoal; não demonstra, sozinho, demanda de mercado, receita ou disposição de terceiros para pagar.

### Limite da proposta

Receber uma solicitação de agendamento não equivale a reservar um horário. Nesta versão, preços, disponibilidade, compromissos com clientes e encerramentos continuam sob confirmação humana. O produto não será apresentado como um atendente autônomo.

*Base documental: proposta escrita fornecida por Bruno [P1] e transcrição anexada [V1]. As regras, campos, métricas e etapas abaixo são detalhamentos propostos, não resultados do vídeo. As verificações externas estão identificadas por referências M, C e N.*

---

## 2. Inspiração do vídeo e recorte do piloto

O vídeo “JEV: Fazer dinheiro com IA nunca foi tão fácil” apresenta um protótipo de formulário para qualificação de leads B2B. O apresentador combina código, JEV e modelos de linguagem para adaptar a experiência e encaminhar o interessado a diferentes destinos. O próprio vídeo caracteriza a solução como protótipo. [V1, 1:43–2:57; 17:39–19:40; 27:23–27:48]

| Elemento do vídeo | Papel apresentado | Adaptação para esta ideia |
| --- | --- | --- |
| Código determinístico | Captura dados e atualiza elementos previsíveis da interface. | Validar campos, controlar estados e executar regras explícitas. |
| JEV | Seleciona categorias, decide encaminhamentos e quais elementos entram no diagrama. | Inspiração para decidir a próxima ação; JEV fica fora do piloto. |
| Modelos de linguagem | Geram perguntas, frases curtas e textos dos diagramas. | Textos padronizados e decisões humanas inicialmente; sem chamadas a modelos. |
| Experiência visual | Anotações, diagramas e pixel art reagem às respostas. | Uma planilha legível; não reproduzir os efeitos visuais. |

*Referências do quadro: [V1, 3:49–4:49; 6:39–8:23; 8:51–9:57; 11:43–12:15; 16:28–16:55]. “JEV” segue a grafia do título; a transcrição contém variações. Não foi realizada auditoria de desempenho ou de capacidades dessa ferramenta.*

### A conexão — interpretação aplicada

A ideia não é copiar o formulário. É transferir um princípio: coletar contexto suficiente, decidir um encaminhamento e executar a ação adequada. No vídeo, o encaminhamento qualifica um lead; aqui, ele organiza uma pendência. São aplicações relacionadas, mas diferentes.

### Incluído na primeira versão

Um operador, um tipo de serviço, um formulário, uma planilha e um canal de aviso interno por e-mail. Captura de pedidos, classificação por regras, próxima ação explícita, atualização manual dos estados e registro básico de resultados do teste.

### Fora da primeira versão

WhatsApp, JEV, outros modelos de IA, agentes autônomos, cobrança, reserva automática de horários, painel próprio, editor de automações para clientes e operação multiempresa. D1 e n8n não serão exigências para iniciar a validação.

> O material demonstra uma possibilidade técnica. A transcrição não apresenta resultados que comprovem aumento de vendas, economia operacional ou rentabilidade desta proposta.

---

## 3. Arquitetura mínima e decisões técnicas

A primeira rodada prioriza o percurso mais curto entre receber um pedido e saber o que fazer. A tabela mantém a pilha sugerida, distinguindo componentes necessários de componentes reservados para evolução.

| Função | Escolha | Decisão para o piloto |
| --- | --- | --- |
| Entrada | Google Forms | Formulário simples. Página própria fica como alternativa posterior. |
| Automação | Make Free | Ler respostas, aplicar regras iniciais, registrar pedido e enviar aviso. |
| Painel e registro | Google Sheets | Fonte operacional de verdade; visualizações por estado. |
| Lógica própria | Worker existente | Preservar e desenvolver localmente; integração não bloqueia a primeira rodada. |
| Persistência adicional | Cloudflare D1 | Adiar enquanto a planilha for suficiente. Não manter duas bases concorrentes. |
| Inteligência artificial | Nenhuma | Usar regras verificáveis e textos fixos. |

### Fluxo adotado para a primeira rodada

```text
Google Forms → Make → Google Sheets → e-mail ao Bruno
```

O Make consulta respostas do formulário, identifica o pedido, verifica se já foi tratado, aplica as regras e grava o resultado. O aviso interno ocorre apenas quando há ação humana pendente. Mudanças posteriores de estado e respostas dos clientes serão registradas manualmente durante esse teste. O conector oficial oferece leitura e acompanhamento de respostas do Forms. [M3]

### Correção explícita: Worker local não é um endpoint do Make

A proposta original combina Make em nuvem com Worker rodando localmente. Um serviço externo não acessa diretamente o localhost do computador. A documentação da Cloudflare distingue execução local e implantação na rede. Por isso, esta primeira rodada deixa o Worker fora do caminho automatizado. [C2]

Quando houver motivo para integrá-lo, publicar um endpoint de teste protegido no plano Free e usar o percurso abaixo. Preservar o webhook de WhatsApp existente, isolando o experimento. Não adicionar VPS, Docker ou túnel para resolver essa etapa.

```text
Forms → Make → Worker publicado → Make → Sheets / aviso
```

Nesse momento, migrar as regras para uma função de domínio no Worker. O Make passa a orquestrar integrações, sem manter uma segunda implementação das mesmas regras. A entrada e a saída da classificação devem permanecer independentes do canal de atendimento.

*Este é um refinamento técnico da proposta original, não uma funcionalidade descrita no vídeo. Nenhuma implantação, configuração de conta ou alteração no Worker foi executada nesta documentação.*

---

## 4. Estados, regras e responsabilidade humana

Os quatro estados originais serão preservados. Cada pedido precisa ter uma próxima ação explícita; o estado sozinho não informa o que o operador deve fazer.

| Estado | Significado | Próxima ação típica |
| --- | --- | --- |
| novo | Pedido recebido, ainda sem triagem concluída. | Classificar e registrar o encaminhamento. |
| aguardando cliente | Uma pergunta ou proposta já foi enviada; falta resposta do solicitante. | Aguardar retorno ou revisar na data combinada. |
| precisa de mim | Há uma decisão, contato ou revisão que depende do operador. | Solicitar informação, preparar orçamento ou confirmar disponibilidade. |
| concluído | O tratamento desta solicitação foi encerrado, com resultado registrado. | Nenhuma, salvo reabertura deliberada. |

### Regras iniciais propostas

Pedido completo: marcar “precisa de mim” e indicar “preparar orçamento” ou “confirmar disponibilidade”, conforme a intenção declarada. Não prometer preço ou horário automaticamente.

Informação essencial faltante: marcar “precisa de mim” e indicar exatamente o que solicitar. Só mudar para “aguardando cliente” depois que a pergunta for efetivamente enviada. Dados faltantes, por si só, não significam que o cliente já foi acionado.

Resposta recebida: o operador registra o retorno e atualiza a próxima ação. Contradição, solicitação fora de escopo ou situação não prevista: encaminhar para revisão humana, com motivo legível; não inventar uma classificação segura.

Encerramento: exigir um resultado, como orçamento enviado e atendimento encerrado, desistência, cancelamento ou agendamento confirmado. “Concluído” se refere à solicitação acompanhada, não necessariamente à prestação do serviço.

### Exemplo fictício de ponta a ponta

Um interessado solicita orçamento, mas não descreve o serviço. O painel mostra “precisa de mim — pedir descrição do serviço”. Bruno envia a pergunta e muda para “aguardando cliente”. Após receber a informação, registra “precisa de mim — preparar orçamento”. Ao encerrar o atendimento, informa o resultado e conclui a solicitação.

### Política de avisos

Enviar e-mail quando a triagem produzir uma ação humana, sem repetir o mesmo aviso a cada consulta do Make. Não enviar avisos para “novo” transitório, espera ainda válida ou item concluído. Mudanças manuais não disparam novos avisos automaticamente nesta rodada; lembretes por prazo ficam para uma etapa posterior.

> Nem todo pedido deixará de exigir trabalho humano. O teste mede se a organização e a triagem economizam esforço — não presume que automatizar o registro equivale a automatizar o atendimento.

---

## 5. Dados, avisos e confiabilidade

### Formulário e painel propostos

Coletar nome, um contato de retorno, tipo de pedido, serviço desejado, descrição e preferência de data ou prazo. Pedir apenas dados úteis à decisão. A preferência de data não representa confirmação de disponibilidade.

| Grupo | Campos propostos |
| --- | --- |
| Identificação | pedido_id, origem, resposta_origem_id, criado_em |
| Solicitante | nome, contato |
| Pedido | tipo_pedido, servico, descricao, data_preferida |
| Operação | status, proxima_acao, responsavel, motivo |
| Acompanhamento | atualizado_em, revisitar_em, resultado |
| Controle técnico | versao_regra, processado_em, aviso_enviado_em, erro_processamento |
| Medição | tempo_manual_seg, tempo_piloto_seg, correcao_necessaria, aviso_util |

Na visualização diária, destacar solicitante, pedido, estado, próxima ação e prazo. Manter campos técnicos fora da visualização principal. Usar os mesmos identificadores ao reprocessar um evento; não usar o número atual da linha da planilha como identidade permanente.

### Contrato futuro do classificador no Worker

Entrada: dados normalizados do pedido. Saída: estado sugerido, próxima ação, motivo, campos faltantes e versão da regra. O classificador sugere uma decisão; o componente responsável pela execução registra mudanças e controla o envio de avisos. Uma sugestão não é prova de que a ação foi executada.

### Modelo de aviso interno — exemplo fictício

> Pedido #P-001 precisa de você.
> Solicitante: Cliente de teste.
> Ação: solicitar a descrição do serviço.
> Motivo: não há informação suficiente para preparar o orçamento.
> Abrir o pedido: referência à linha no painel.

### Controles mínimos antes de usar dados reais

Registrar o pedido antes de avisar. Detectar reenvio pelo identificador de origem e preservar alterações humanas. Testar de forma serializada na planilha, sem prometer proteção transacional para múltiplos operadores. Separar falha de processamento do estado comercial: erro não deve aparecer como atendimento concluído.

Registrar falhas de envio e retomar apenas a etapa necessária. Uma interrupção depois do envio, mas antes do registro, pode gerar repetição; o piloto deve medir esse caso, não alegar entrega “exatamente uma vez”. Restringir acessos, manter credenciais fora da planilha e começar com dados fictícios. Para o teste real, definir aviso de privacidade e prazo de retenção.

---

## 6. Experimento e critérios de validação

Os volumes e metas abaixo são critérios iniciais propostos. Não vêm do vídeo, não são benchmarks de mercado e não representam resultados já alcançados.

### Rodada A — teste interno com Bruno

Preparar pelo menos 20 casos fictícios, incluindo pedidos completos, dados faltantes, dúvida de escopo, retorno de cliente, cancelamento e encerramento. Comparar atendimento manual e atendimento com o piloto em conjuntos equivalentes, alternando a ordem para reduzir o efeito de aprendizagem.

Cronometrar o tempo de trabalho humano para registrar e decidir a próxima ação. Medir separadamente a espera até o Make processar o pedido. Somar correções e recuperação de falhas ao esforço do piloto; manter o tempo de construção separado para não esconder o custo de implantação.

| Métrica | Como medir | Meta inicial proposta |
| --- | --- | --- |
| Integridade | Pedidos válidos registrados / pedidos válidos enviados. | 100% no conjunto de teste; nenhum perdido silenciosamente. |
| Próxima ação correta | Decisões aceitas sem correção / decisões avaliadas. | Pelo menos 90%. |
| Economia de esforço | Comparar medianas do tempo humano manual e com piloto. | Redução de pelo menos 30%, sem perda de qualidade. |
| Relevância dos avisos | Avisos considerados necessários / avisos enviados. | Pelo menos 90%; registrar também avisos necessários que faltaram. |
| Confiabilidade | Reenvios e falhas controladas, com inspeção dos registros. | Sem pedido duplicado nos testes; falhas visíveis e recuperáveis. |

*Fórmula de economia: (mediana manual − mediana com piloto) ÷ mediana manual × 100. Não calcular com mediana manual igual a zero. Metas em amostra pequena orientam decisão; não estimam precisão estatística em produção.*

### Testes que não podem faltar

Reenviar o mesmo evento; simular falha ao gravar; simular falha no aviso; confirmar que “aguardando cliente” exige contato anterior; verificar que reprocessamento não apaga uma decisão humana; abrir o painel como alguém que não acompanhou a implementação.

### Rodada B — utilidade fora do ambiente do criador

Depois de corrigir as falhas internas, testar com um prestador externo em um recorte definido: por exemplo, cinco dias úteis e ao menos dez pedidos reais, quando esse volume existir. Observar uso sem ajuda constante, pendências recuperadas e interesse em continuar. Pedir um compromisso concreto de continuidade, não apenas uma opinião favorável.

Decisão: avançar se houver ganho repetível e uso independente; revisar se o fluxo funcionar, mas exigir explicação constante; interromper ou mudar o recorte se ele acrescentar trabalho. Sem usuário externo e disposição a pagar, a validação comercial continua pendente.

---

## 7. Limites, custos e ressalvas verificadas

*Verificação documental em 16/10/2026. Planos e condições devem ser revistos antes de ampliar o uso.*

### Make Free: 1.000 créditos não são 1.000 pedidos

A página de preços informa 1.000 créditos mensais e intervalo mínimo de 15 minutos para execuções agendadas no Free. O consumo depende dos módulos executados, não apenas da quantidade de pedidos. Leituras, buscas, gravações e avisos devem entrar no orçamento. [M1, M2]

Consultas periódicas também executam operações. Como ilustração, uma consulta a cada 15 minutos, 24 horas por dia, gera 2.880 verificações em 30 dias. Se cada verificação consumir um crédito, ela já excede a franquia antes de tratar os pedidos. Não é uma medição deste piloto. [M2]

Decisão proposta: usar janelas controladas ou execução manual durante o teste e medir os créditos por caso. O fluxo Forms consultado periodicamente não deve ser prometido como instantâneo. Webhooks são uma alternativa orientada a eventos, mas não justificam construir uma página própria antes de comprovar a utilidade. [M4]

### Cloudflare: franquia ampla não é capacidade ilimitada

Workers Free oferece 100 mil requisições por dia e 10 milissegundos de CPU por invocação. Isso é compatível com a intenção de executar regras leves, mas a adequação precisa ser medida no código real; contagem de requisições não substitui teste de CPU. [C1]

D1 está disponível no plano Free com 5 milhões de linhas lidas por dia, 100 mil linhas escritas por dia e 5 GB de armazenamento total; o limite por banco no Free é 500 MB. Há bloqueio de consultas ao exceder os limites diários. Manter D1 como evolução, não como requisito do primeiro teste. [C3, C4]

### n8n: licença e operação são decisões diferentes

A documentação oficial permite usar a edição Community auto-hospedada para aprendizado e para automações criadas por você para clientes. A restrição relevante não é só mostrar o editor: permitir que o cliente construa ou configure a lógica, inclusive por interface própria, API ou agente de IA, exige rever o licenciamento. Validar o desenho comercial antes de oferecer essa capacidade. [N1, N2]

Rodar n8n localmente pode servir ao aprendizado. Para prestar um serviço contínuo, ainda será necessário resolver disponibilidade, atualização e recuperação. Migrar do Make não é um passo obrigatório: só fazer isso quando o controle adicional compensar o trabalho operacional.

### Orçamento e registro do experimento

Meta: nenhuma nova assinatura de infraestrutura para a primeira rodada, respeitando as franquias das contas utilizadas. Registrar créditos, pedidos, falhas e horas de trabalho. Não confundir custo de licença zero com custo total zero, nem estimar lucro antes de conhecer implantação, manutenção e suporte.

---

## 8. Evolução, decisões abertas e referências

### Ordem proposta de evolução

Primeiro, provar o ciclo pedido → próxima ação → intervenção → encerramento. Depois, obter uso real de um prestador. Integrar o Worker quando as regras merecerem uma implementação própria; adotar D1 quando histórico, concorrência ou confiabilidade excederem o que a planilha permite.

Adicionar WhatsApp quando o fluxo justificar testar o canal comercial. Formulários validam a organização e a triagem, mas não a adesão pelo WhatsApp. IA entra apenas diante de uma tarefa de interpretação ou redação que regras e textos fixos não resolvam bem, com avaliação de erro, custo e revisão humana. n8n e painel próprio dependerão de gargalos observados, não de uma sequência obrigatória.

### Decisões ainda em aberto

Escolher o primeiro tipo de serviço, quais informações bastam para um orçamento e quem será o primeiro operador externo. Definir janela de acompanhamento, canal de retorno ao solicitante e critério de encerramento. Avaliar cobrança por implantação e/ou mensalidade somente após conhecer valor percebido e custo de servir; não há preço validado.

> Próximo passo executável: escolher um único tipo de pedido, escrever os casos de teste e montar apenas o caminho Forms → Make → Sheets → aviso. A entrega desta etapa é evidência de utilidade, não uma plataforma completa.

### Referências e rastreabilidade

P1 — Proposta de pilha mínima fornecida por Bruno nesta conversa, em 16/10/2026. Fonte das ferramentas sugeridas e da sequência inicial de validação.

[V1 — Transcrição anexada: “Texto colado(8).txt”, vídeo “JEV: Fazer dinheiro com IA nunca foi tão fácil”. A análise usa o texto fornecido, não inspeção visual do vídeo.](https://www.youtube.com/watch?v=2Ui4Qiuo-tQ)

[M1 — Make: planos, créditos incluídos e intervalo do Free.](https://www.make.com/en/pricing)

[M2 — Make: créditos e operações; base do cuidado com consultas periódicas.](https://help.make.com/credits)

[M2 (complemento) — Make: operações e verificações de gatilhos.](https://help.make.com/operations)

[M3 — Make: conector Google Forms.](https://apps.make.com/google-forms)

[M4 — Make: webhooks e processamento por evento.](https://help.make.com/webhooks)

[C1 — Cloudflare: preços e limites de Workers.](https://developers.cloudflare.com/workers/platform/pricing/)

[C2 — Cloudflare: desenvolvimento local e distinção da execução publicada.](https://developers.cloudflare.com/workers/local-development/)

[C3 — Cloudflare: preços e franquias do D1.](https://developers.cloudflare.com/d1/platform/pricing/)

[C4 — Cloudflare: limites do D1 e aplicação das franquias diárias.](https://developers.cloudflare.com/d1/platform/limits/)

[C4 (complemento) — D1: bloqueio por limite diário no Free.](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)

[N1 — n8n: License FAQ da edição Community.](https://docs.n8n.io/n8n-community-license/community-license/license-faq)

[N2 — n8n: orientação oficial sobre licença por caso de uso.](https://support.n8n.io/article/can-i-use-your-license-for-my-use-case)
