# C1. Type Assertions no Notification Repository

> **Severidade:** CRITICO | **Esforco:** P (1h) | **Prioridade:** Semana 1

---

## Problema

18 instancias de `as string`, `as boolean`, `as Date` no `prisma-notification-repository.ts`. Viola proibicao absoluta do CLAUDE.md.

## Arquivo

`packages/core/src/modules/notification/infrastructure/prisma-notification-repository.ts` (linhas 11-22, 41, 52, 81)

## Codigo Atual

```typescript
function toData(row: Record<string, unknown>): NotificationData {
  return {
    id: row.id as string,
    organizationId: row.organizationId as string,
    userId: row.userId as string,
    // ... 15 mais
  }
}

return toData(row as unknown as Record<string, unknown>)
```

## Correcao

```typescript
import type { Notification } from '@prisma/client'

function toData(row: Notification): NotificationData {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    // ... sem assertions
  }
}
```

## Criterios de Aceite

- [ ] Zero `as` type assertions no arquivo (exceto `as const`)
- [ ] `pnpm typecheck` passa sem erros
- [ ] Testes existentes continuam passando
