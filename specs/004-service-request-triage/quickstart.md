# Validação local

1. Rode `npm run typecheck` e `npm test`.
2. Aplique todas as migrations somente com `--local`.
3. Inicie o mock local e o Worker local conforme `docs/LOCAL_VALIDATION.md`.
4. Execute o smoke test de agenda e o smoke test de solicitações.
5. Consulte o D1 local e confirme uma solicitação pendente para piscina e outra
   para jardinagem, sem reservas automáticas correspondentes.
