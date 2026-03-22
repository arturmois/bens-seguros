# Auditoria de Produção — CRÍTICO

> Itens que **DEVEM** ser corrigidos antes do lançamento em produção.
> Data da auditoria: 22/03/2026

---

## C1. Type assertions no notification repository

**Severidade:** CRÍTICO
**Arquivo:** `packages/core/src/modules/notification/infrastructure/prisma-notification-repository.ts`
**Linhas:** 11-22, 41, 52, 81
**Contagem:** 18 instâncias de `as`

**Problema:**
A função `toData()` usa `as string`, `as boolean`, `as Date` e `as unknown as Record<string, unknown>` para converter rows do Prisma. Isso viola a proibição absoluta do CLAUDE.md:

> NO `as` type assertions — use type guards, generics, or redesign. Exception: test mocks only

**Exemplo do código atual:**

```typescript
function toData(row: Record<string, unknown>): NotificationData {
  return {
    id: row.id as string, // ❌
    organizationId: row.organizationId as string, // ❌
    userId: row.userId as string, // ❌
    // ... 15 mais
  }
}

// Chamadas:
return toData(row as unknown as Record<string, unknown>) // ❌
```

**Correção:**
Tipar o input de `toData()` com o tipo Prisma correto e remover todas as assertions:

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

---

## C2. Vulnerabilidades HIGH em dependências transitivas

**Severidade:** CRÍTICO
**Arquivos afetados:** `pnpm-lock.yaml`, `package.json` (root e packages)

**Vulnerabilidades:**

| Dependência                   | Severidade | Via                    | CVE/Issue                               |
| ----------------------------- | ---------- | ---------------------- | --------------------------------------- |
| `hono < 4.12.4`               | HIGH       | `@prisma/dev@0.20.0`   | Arbitrary file access via serveStatic   |
| `@hono/node-server < 1.19.10` | HIGH       | `@prisma/dev@0.20.0`   | Encoded slash auth bypass               |
| `effect < 3.20.0`             | HIGH       | `@prisma/config@7.5.0` | AsyncLocalStorage context contamination |
| `jsondiffpatch < 0.7.2`       | MODERATE   | `ai@4.3.19`            | XSS via HtmlFormatter                   |
| `ai < 5.0.52`                 | LOW        | `packages/ai`          | File type whitelist bypass              |

**Correção:**

```bash
pnpm up prisma @prisma/client @prisma/adapter-pg
pnpm up ai
pnpm audit
```

---

## C3. Falta favicon.ico

**Severidade:** CRÍTICO (cosmético, mas visível em todo request)
**Arquivo:** `apps/web/public/` (ausente)

**Problema:**
Toda navegação gera `404 (Not Found)` para `/favicon.ico` nos logs do browser. Em produção, isso polui logs de monitoramento e dá impressão de erro.

**Correção:**
Adicionar um `favicon.ico` (e opcionalmente `favicon.svg` + manifesto) em `apps/web/public/`. Pode usar o logo da aplicação ou gerar a partir das iniciais "BS".
