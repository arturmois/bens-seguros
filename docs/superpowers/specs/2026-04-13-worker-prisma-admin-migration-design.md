# Worker prismaAdmin Migration — Design Spec

> **Data:** 2026-04-13
> **Prioridade:** P0 — workers silenciosamente retornando 0 resultados em prod
> **Escopo:** `apps/worker/src/processors/` (11 arquivos)

---

## Problema

Após a ativação de RLS com FORCE ROW LEVEL SECURITY em produção (PR #96), os processors do ERP worker continuam usando o client `prisma` (role `app_user`). Sem `SET LOCAL app.current_tenant`, queries em tabelas com policy STRICT retornam 0 rows silenciosamente.

**Impacto em produção:**

| Processor         | Efeito                                            |
| ----------------- | ------------------------------------------------- |
| expire-policies   | Apólices vencidas nunca expiram                   |
| csv-import        | Importação CSV falha (0 clients criados)          |
| send-quote-email  | Cotação enviada mas `sentToClientAt` não atualiza |
| notification      | Notificações in-app não são criadas               |
| alerts (4 checks) | Alertas proativos não detectam nada               |

## Decisão de Design

**Abordagem escolhida:** Trocar `prisma` → `prismaAdmin` nos processors afetados.

**Alternativas descartadas:**

- `createTenantClient(organizationId)` por job — overhead desnecessário; `expire-policies` é cross-tenant por design e não tem organizationId
- `WORKER_DATABASE_URL` (env var nova) — `prismaAdmin` já usa `DATABASE_ADMIN_URL` e está configurado em prod

**Justificativa:** Workers são código interno confiado. O filtro `organizationId` no WHERE é a isolação primária. RLS é defesa em profundidade para o caminho HTTP, não para batch jobs. O padrão `prismaAdmin` já é usado pelos repos do DI container no server.

## Arquivos a Modificar

11 arquivos, todos em `apps/worker/src/processors/`:

| #   | Arquivo                               | Mudança                                 | Tabelas STRICT acessadas                                    |
| --- | ------------------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| 0   | `audit-archive-processor.ts`          | `prisma` → `prismaAdmin` (L1)           | AuditLog (STRICT read) + AuditLogArchive (PERMISSIVE write) |
| 1   | `csv-import-processor.ts`             | `prisma` → `prismaAdmin` (L3)           | Client, Policy, Proposal                                    |
| 2   | `expire-policies-processor.ts`        | `prisma` → `prismaAdmin` (L1)           | Policy                                                      |
| 3   | `send-quote-email-processor.ts`       | `prisma` → `prismaAdmin` (L8)           | Proposal                                                    |
| 4   | `notification-processor.ts`           | `prisma` → `prismaAdmin` (L7, L19, L41) | Notification                                                |
| 5   | `alerts/index.ts`                     | `prisma` → `prismaAdmin` (L2)           | Organization (sem RLS, mas consistência)                    |
| 6   | `alerts/idempotency.ts`               | `prisma` → `prismaAdmin` (L1)           | Notification                                                |
| 7   | `alerts/check-policy-expiry.ts`       | `prisma` → `prismaAdmin` (L2)           | Policy, Member                                              |
| 8   | `alerts/check-claims-stalled.ts`      | `prisma` → `prismaAdmin` (L2)           | Claim, Member                                               |
| 9   | `alerts/check-proposals-stagnant.ts`  | `prisma` → `prismaAdmin` (L2)           | Proposal, Member                                            |
| 10  | `alerts/check-commissions-pending.ts` | `prisma` → `prismaAdmin` (L2)           | Commission, Member                                          |

## Correção Pós-Review

O `audit-archive-processor.ts` foi incluído na migração após code review identificar que ele **lê** de `AuditLog` (STRICT policy) antes de escrever em `AuditLogArchive` (PERMISSIVE). A exclusão original focava apenas no write side.

## Natureza da Mudança

Cada arquivo requer apenas a troca do import:

```typescript
// ANTES
import { prisma } from '@repo/db'

// DEPOIS
import { prismaAdmin } from '@repo/db'
```

E substituir todas as referências de `prisma.` por `prismaAdmin.` no corpo do arquivo. Onde `prisma` é passado como argumento (e.g., `PrismaNotificationRepository(prisma)`), trocar para `prismaAdmin`.

Nenhuma mudança de lógica, tipos ou assinaturas. O tipo `PrismaClient` é o mesmo para ambos os clients.

## Chat-Worker

**Não afetado.** O chat-worker usa exclusivamente MongoDB via Mongoose (`@repo/db-chat`). Sem Prisma, sem RLS.

## Verificação

1. `pnpm typecheck` — zero erros
2. `pnpm test` — testes existentes passam (mocks não são afetados pela troca de import)
3. Deploy em prod + verificação manual:
   - Trigger `expire-policies` job → confirmar que apólices vencidas mudam para EXPIRED
   - Trigger `proactive-alerts` job → confirmar que alertas são criados
   - Testar import CSV → confirmar que clients são criados
   - Enviar cotação por email → confirmar `sentToClientAt` atualizado

## Riscos

- **Baixo:** Nenhuma mudança de lógica. Mesmo tipo `PrismaClient`, mesmas queries, apenas connection string diferente (superuser vs app_user).
- **Mitigação:** Se `DATABASE_ADMIN_URL` não estiver setado, `prismaAdmin` faz fallback para `DATABASE_URL` (comportamento atual do `packages/db/src/index.ts`).
