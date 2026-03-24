# L2. Claim Number via Aggregate (Performance)

> **Severidade:** LOW (performance) | **Esforco:** P (1h) | **Prioridade:** Backlog

---

## Problema

Proximo numero de sinistro calculado via `prisma.claim.aggregate({ _max: { claimNumber } })` dentro de transaction. Para orgs com milhares de sinistros, fica lento.

## Arquivo

`packages/core/src/modules/claim/infrastructure/prisma-claim-repository.ts` linha 26-49

## Correcao (Opcional)

Usar Redis INCR para sequencia atomica por organizacao:

```typescript
const nextNumber = await redis.incr(`claim-seq:${organizationId}`)
```

Ou manter aggregate — funciona bem para <10k sinistros por org (cenario atual com ~10 corretores).

## Criterios de Aceite

- [ ] Sequencia atomica garantida
- [ ] Sem duplicatas de claimNumber
- [ ] Performance aceitavel para volume esperado
