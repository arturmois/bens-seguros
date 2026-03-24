# L3. Route Files >200 Linhas

> **Severidade:** LOW (manutenibilidade) | **Esforco:** M (1 dia) | **Prioridade:** Backlog

---

## Problema

Route files concentram schema + handler + error mapping. Com muitos endpoints, ultrapassam 200 linhas.

## Arquivos

- `apps/server/src/routes/v1/commission-routes.ts` — 328 linhas (8 endpoints)
- `apps/server/src/routes/v1/proposal-routes.ts` — 258 linhas (6 endpoints)
- `apps/server/src/routes/v1/claim-routes.ts` — 231 linhas (5 endpoints)

## Correcao (Opcional)

Extrair handlers para arquivos separados:

```
routes/v1/commissions/
  index.ts               (route registration)
  schemas.ts             (Zod schemas)
  handlers.ts            (handler functions)
  error-mapping.ts       (domain error -> HTTP)
```

Nao e blocker — o padrao atual e funcional e legivel. Priorizar apenas se os arquivos crescerem alem de 400 linhas.

## Criterios de Aceite

- [ ] Route files <= 200 linhas cada (ou decisao explicita de manter)
- [ ] Funcionalidade identica
- [ ] Schemas reutilizaveis entre routes se extraidos
