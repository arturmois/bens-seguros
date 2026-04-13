# Worker prismaAdmin Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 broken ERP worker processors by switching from `prisma` (RLS-blocked) to `prismaAdmin` (superuser) for all Prisma queries.

**Architecture:** Pure import swap — replace `prisma` with `prismaAdmin` in 10 processor files. No logic changes, no new env vars, no new functions. `prismaAdmin` is already exported from `@repo/db` and configured in production via `DATABASE_ADMIN_URL`.

**Tech Stack:** Prisma 7, TypeScript 5.9, BullMQ 5

**Spec:** `docs/superpowers/specs/2026-04-13-worker-prisma-admin-migration-design.md`

---

## File Structure

All changes in `apps/worker/src/processors/`. No files created or deleted.

| Action | File                                  | Responsibility                                    |
| ------ | ------------------------------------- | ------------------------------------------------- |
| Modify | `csv-import-processor.ts`             | Swap `prisma` → `prismaAdmin` (import + 6 usages) |
| Modify | `expire-policies-processor.ts`        | Swap `prisma` → `prismaAdmin` (import + 1 usage)  |
| Modify | `send-quote-email-processor.ts`       | Swap `prisma` → `prismaAdmin` (import + 1 usage)  |
| Modify | `notification-processor.ts`           | Swap `prisma` → `prismaAdmin` (import + 2 usages) |
| Modify | `alerts/index.ts`                     | Swap `prisma` → `prismaAdmin` (import + 1 usage)  |
| Modify | `alerts/idempotency.ts`               | Swap `prisma` → `prismaAdmin` (import + 1 usage)  |
| Modify | `alerts/check-policy-expiry.ts`       | Swap `prisma` → `prismaAdmin` (import + 2 usages) |
| Modify | `alerts/check-claims-stalled.ts`      | Swap `prisma` → `prismaAdmin` (import + 2 usages) |
| Modify | `alerts/check-proposals-stagnant.ts`  | Swap `prisma` → `prismaAdmin` (import + 2 usages) |
| Modify | `alerts/check-commissions-pending.ts` | Swap `prisma` → `prismaAdmin` (import + 2 usages) |

**Not modified:** `audit-archive-processor.ts` — uses AuditLogArchive which has PERMISSIVE RLS policy (IS NULL escape). Works correctly with `prisma`.

---

## Task 1: Migrate Core Processors (4 files)

**Files:**

- Modify: `apps/worker/src/processors/csv-import-processor.ts:3`
- Modify: `apps/worker/src/processors/expire-policies-processor.ts:1`
- Modify: `apps/worker/src/processors/send-quote-email-processor.ts:8`
- Modify: `apps/worker/src/processors/notification-processor.ts:7`

- [ ] **Step 1: Swap import in csv-import-processor.ts**

In `apps/worker/src/processors/csv-import-processor.ts`, line 3, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Then replace all `prisma.` with `prismaAdmin.` in the file body (6 occurrences at lines 122, 134, 166, 187, 203, 216):

- `prisma.client.createMany` → `prismaAdmin.client.createMany`
- `prisma.client.create` → `prismaAdmin.client.create`
- `prisma.client.findFirst` → `prismaAdmin.client.findFirst`
- `prisma.policy.findFirst` → `prismaAdmin.policy.findFirst`
- `prisma.proposal.create` → `prismaAdmin.proposal.create`
- `prisma.policy.create` → `prismaAdmin.policy.create`

- [ ] **Step 2: Swap import in expire-policies-processor.ts**

In `apps/worker/src/processors/expire-policies-processor.ts`, line 1, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Replace 1 occurrence at line 21:

- `prisma.policy.updateMany` → `prismaAdmin.policy.updateMany`

- [ ] **Step 3: Swap import in send-quote-email-processor.ts**

In `apps/worker/src/processors/send-quote-email-processor.ts`, line 8, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Replace 1 occurrence at line 92:

- `prisma.proposal.update` → `prismaAdmin.proposal.update`

- [ ] **Step 4: Swap import in notification-processor.ts**

In `apps/worker/src/processors/notification-processor.ts`, line 7, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Replace 2 occurrences:

- Line 19: `new PrismaNotificationRepository(prisma)` → `new PrismaNotificationRepository(prismaAdmin)`
- Line 41: `await prisma.notification.update(` → `await prismaAdmin.notification.update(`

- [ ] **Step 5: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS (zero errors). `prismaAdmin` has the same `PrismaClient` type as `prisma`.

- [ ] **Step 6: Commit**

```bash
git add apps/worker/src/processors/csv-import-processor.ts apps/worker/src/processors/expire-policies-processor.ts apps/worker/src/processors/send-quote-email-processor.ts apps/worker/src/processors/notification-processor.ts
git commit -m "fix(worker): use prismaAdmin in core processors to bypass RLS"
```

---

## Task 2: Migrate Alert Processors (6 files)

**Files:**

- Modify: `apps/worker/src/processors/alerts/index.ts:2`
- Modify: `apps/worker/src/processors/alerts/idempotency.ts:1`
- Modify: `apps/worker/src/processors/alerts/check-policy-expiry.ts:2`
- Modify: `apps/worker/src/processors/alerts/check-claims-stalled.ts:2`
- Modify: `apps/worker/src/processors/alerts/check-proposals-stagnant.ts:2`
- Modify: `apps/worker/src/processors/alerts/check-commissions-pending.ts:2`

- [ ] **Step 1: Swap import in alerts/index.ts**

In `apps/worker/src/processors/alerts/index.ts`, line 2, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Replace 1 occurrence (the `prisma.organization.findMany` call):

- `prisma.organization.findMany` → `prismaAdmin.organization.findMany`

- [ ] **Step 2: Swap import in alerts/idempotency.ts**

In `apps/worker/src/processors/alerts/idempotency.ts`, line 1, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Replace 1 occurrence at line 33:

- `prisma.notification.findFirst` → `prismaAdmin.notification.findFirst`

- [ ] **Step 3: Swap import in alerts/check-policy-expiry.ts**

In `apps/worker/src/processors/alerts/check-policy-expiry.ts`, line 2, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Replace 2 occurrences:

- `prisma.member.findMany` → `prismaAdmin.member.findMany`
- `prisma.policy.findMany` → `prismaAdmin.policy.findMany`

- [ ] **Step 4: Swap import in alerts/check-claims-stalled.ts**

In `apps/worker/src/processors/alerts/check-claims-stalled.ts`, line 2, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Replace 2 occurrences:

- Line 24: `prisma.member.findMany` → `prismaAdmin.member.findMany`
- Line 31: `prisma.claim.findMany` → `prismaAdmin.claim.findMany`

- [ ] **Step 5: Swap import in alerts/check-proposals-stagnant.ts**

In `apps/worker/src/processors/alerts/check-proposals-stagnant.ts`, line 2, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Replace 2 occurrences:

- Line 19: `prisma.member.findMany` → `prismaAdmin.member.findMany`
- Line 26: `prisma.proposal.findMany` → `prismaAdmin.proposal.findMany`

- [ ] **Step 6: Swap import in alerts/check-commissions-pending.ts**

In `apps/worker/src/processors/alerts/check-commissions-pending.ts`, line 2, change:

```typescript
// OLD
import { prisma } from '@repo/db'

// NEW
import { prismaAdmin } from '@repo/db'
```

Replace 2 occurrences:

- Line 18: `prisma.member.findMany` → `prismaAdmin.member.findMany`
- Line 25: `prisma.commission.findMany` → `prismaAdmin.commission.findMany`

- [ ] **Step 7: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS (zero errors).

- [ ] **Step 8: Commit**

```bash
git add apps/worker/src/processors/alerts/
git commit -m "fix(worker): use prismaAdmin in alert processors to bypass RLS"
```

---

## Task 3: Final Verification

- [ ] **Step 1: Run full quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

Expected: All pass. No worker-specific tests exist, but monorepo tests should not regress.

- [ ] **Step 2: Verify no remaining `prisma` imports in worker processors (except audit-archive)**

```bash
grep -rn "from '@repo/db'" apps/worker/src/processors/ | grep -v prismaAdmin | grep -v audit-archive
```

Expected: No output (zero remaining `prisma` imports in non-audit processors).

- [ ] **Step 3: Verify audit-archive still uses `prisma`**

```bash
grep -n "from '@repo/db'" apps/worker/src/processors/audit-archive-processor.ts
```

Expected: `1:import { prisma, Prisma } from '@repo/db'` — unchanged, still using regular `prisma`.
