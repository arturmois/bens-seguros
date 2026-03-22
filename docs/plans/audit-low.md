# Auditoria de Produção — LOW

> Itens para o **backlog**. Melhorias de otimização e refinamento.
> Data da auditoria: 22/03/2026

---

## L1. Index composto `(organizationId, role)` faltando no Member

**Severidade:** LOW (performance)
**Arquivo:** `packages/db/prisma/schema.prisma` — modelo Member

**Problema:**
Queries de notificação buscam membros por role (ADMIN, MANAGER, OWNER) para determinar destinatários:

```typescript
prisma.member.findMany({
  where: { organizationId, role: { in: ['ADMIN', 'MANAGER', 'OWNER'] } },
})
```

Não há index composto para esta consulta.

**Impacto:** Lento para organizações com muitos membros (>50).

**Correção:**

```prisma
model Member {
  // ...
  @@index([organizationId, role])
}
```

---

## L2. Claim number gerado via aggregate

**Severidade:** LOW (performance)
**Arquivo:** `packages/core/src/modules/claim/infrastructure/prisma-claim-repository.ts` linha 26-49

**Problema:**
O próximo número de sinistro é calculado via `prisma.claim.aggregate({ _max: { claimNumber } })` dentro de uma transaction. Para organizações com milhares de sinistros, o aggregate fica mais lento.

**Correção alternativa:**
Usar Redis INCR para sequência por organização:

```typescript
const nextNumber = await redis.incr(`claim:${orgId}:nextNumber`)
```

Ou manter o aggregate (funciona bem para <10k sinistros por org).

---

## L3. Route files acima de 200 linhas

**Severidade:** LOW (manutenibilidade)
**Arquivos:**

- `apps/server/src/routes/v1/commission-routes.ts` — 328 linhas (8 endpoints)
- `apps/server/src/routes/v1/proposal-routes.ts` — 258 linhas (6 endpoints)
- `apps/server/src/routes/v1/claim-routes.ts` — 231 linhas (5 endpoints)

**Problema:**
Route files concentram schema + handler + error mapping + registration. Com muitos endpoints, ultrapassam 200 linhas.

**Correção (opcional):**
Extrair handlers para arquivos separados:

```
routes/v1/commissions/
  commission-routes.ts      (registration + schemas)
  commission-handlers.ts    (handler functions)
  commission-errors.ts      (error mapping)
```

Não é blocker — o padrão atual é funcional e legível.

---

## L4. jsondiffpatch XSS (dependência transitiva)

**Severidade:** LOW
**Dependência:** `jsondiffpatch < 0.7.2` via `ai@4.3.19`

**Problema:**
XSS via `HtmlFormatter` do jsondiffpatch. Risco real é baixo porque o projeto não renderiza HTML de diffs.

**Correção:**
Será resolvido automaticamente ao atualizar o pacote `ai` (C2).

---

## L5. Proposal e Commission entities com ~200 linhas

**Severidade:** LOW (informativo)
**Arquivos:**

- `packages/core/src/modules/proposal/domain/proposal.ts` — 206 linhas
- `packages/core/src/modules/commission/domain/commission.ts` — 203 linhas

**Problema:**
Marginalmente acima do limite de 200 linhas, mas são entidades DDD ricas com estado machine.

**Ação:** Nenhuma. Entidades com comportamento complexo justificam o tamanho. Monitorar para não crescer além de 250.

---

## L6. container-registrations.ts com 292 linhas

**Severidade:** LOW (informativo)
**Arquivo:** `apps/server/src/container-registrations.ts`

**Problema:**
Arquivo de configuração DI com 54+ registrations. Grande mas é apenas wiring.

**Correção (futura):**
Se crescer muito, dividir por módulo:

```typescript
// container/client.ts
// container/proposal.ts
// etc.
```
