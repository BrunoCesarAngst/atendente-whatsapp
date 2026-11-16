# Validação rápida

## Pré-requisitos

- Banco D1 criado e vinculado manualmente ao Worker como `DB`.
- Migrações aplicadas ao banco local antes do ambiente remoto.
- Configuração fictícia da barbearia disponível no módulo de domínio.

## Cenários

1. Envie `oi`; receba botões para agendar, serviços ou humano.
2. Selecione agendamento, serviço, dia e hora; confirme e verifique uma reserva
   `confirmed` persistida.
3. Tente confirmar o mesmo horário em uma segunda conversa; receba nova escolha de
   horário e mantenha uma única reserva.
4. Interrompa após escolher serviço; envie nova mensagem e verifique retomada na
   escolha de dia.
5. Cancele a reserva; confirme que o horário reaparece. Repita com remarcação.
6. Escolha handoff; verifique que novas mensagens não recebem resposta automática.

Execute `npm test` e as migrações locais. Não publique sem autorização explícita.
