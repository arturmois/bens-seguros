# L1. Index Composto (organizationId, role) no Member

> **Severidade:** LOW (performance) | **Esforco:** P (15min) | **Prioridade:** Backlog

---

## Problema

Queries de notificacao buscam membros por role sem index composto.

## Arquivo

`packages/db/prisma/schema.prisma` — modelo Member

## Correcao

```prisma
model Member {
  // ...
  @@index([organizationId, role])
}
```

```bash
pnpm prisma migrate dev --name add-member-org-role-index
```

## Criterios de Aceite

- [ ] Index criado
- [ ] Migration aplicada
- [ ] Query plan mostra uso do index
