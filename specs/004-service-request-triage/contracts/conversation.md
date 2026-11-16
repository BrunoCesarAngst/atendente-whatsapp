# Contrato de conversa de triagem

## Entrada

Uma mensagem de texto ou resposta interativa autenticada, associada ao perfil
de negócio configurado no Worker.

## Saída

- Perfil de agenda: resposta de reserva existente.
- Perfil de triagem: próxima pergunta, confirmação de pedido pendente ou silêncio
  quando a conversa estiver em modo humano.

## Invariantes

- Reentregas não duplicam efeitos.
- Triagem não confirma preço ou horário.
- Após a solicitação, somente retomada explícita pode reativar a automação.
