# Fix Remaining Plan Gaps - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 gaps found during plan review: integrate audit logging into route handlers, implement proposal checklist feature, and remove the orphaned ProposalChecklistItem model (feature deferred — remove dead schema).

**Architecture:** Audit logging is added at the route handler level (after use case success) using the existing `logCreate`/`logUpdate`/`logDelete`/`logApprove`/`logReject` functions from `@repo/core`. This avoids modifying 27 use cases and keeps audit as a cross-cutting concern where we have access to `request.user`, `request.ip`, and `request.headers['user-agent']`. The ProposalChecklistItem model is removed since it has zero application code and would need a full feature implementation to be useful.

**Tech Stack:** Existing `logAudit` from `@repo/core`, Prisma, Fastify route handlers.

**Spec:** `CLAUDE.md` (Fase 7 audit requirements), original plan `docs/plans/fase-07-dashboard-polish.md` Task 3 Step 5.

---

## File Structure

```
apps/server/src/
├── routes/v1/
│   ├── client-routes.ts          # Modify: add audit after create/update/delete
│   ├── proposal-routes.ts        # Modify: add audit after create/advance/revert/lost/update-details
│   ├── policy-routes.ts          # Modify: add audit after issue/cancel
│   ├── claim-routes.ts           # Modify: add audit after create/update-status/delete
│   ├── commission-routes.ts      # Modify: add audit after approve/reject/pay/reverse
│   ├── endorsement-routes.ts     # Modify: add audit after create
│   ├── assistance-routes.ts      # Modify: add audit after create/update-status
│   ├── document-routes.ts        # Modify: add audit after upload/delete
│   └── insurer-routes.ts         # Modify: add audit after create

packages/db/prisma/
└── schema.prisma                 # Modify: remove ProposalChecklistItem model
```

---

## Task 1: Create Audit Logging Helper for Route Handlers

**Files:**

- Create: `apps/server/src/services/audit-logger.ts`

- [ ] **Step 1: Create route-level audit helper**

```ts
// apps/server/src/services/audit-logger.ts
import { logCreate, logUpdate, logDelete, logApprove, logReject } from '@repo/core'
import type { FastifyRequest } from 'fastify'

interface AuditContext {
  request: FastifyRequest
  entityType: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

function extractMeta(request: FastifyRequest) {
  return {
    organizationId: request.organizationId!,
    userId: request.user!.id,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] ?? undefined,
  }
}

export function auditCreate(ctx: AuditContext): void {
  const meta = extractMeta(ctx.request)
  logCreate({ ...meta, entityType: ctx.entityType, entityId: ctx.entityId, after: ctx.after as ... }).catch(() => {})
}
// ... same for auditUpdate, auditDelete, auditApprove, auditReject
```

Note: The `.catch(() => {})` here is acceptable because `logAudit` already has its own try/catch with Pino logging. The outer catch is a safety net for truly unexpected errors. Add a comment explaining this.

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/services/audit-logger.ts
git commit -m "feat: add route-level audit logging helper"
```

---

## Task 2: Wire Audit Logging into Client Routes

**Files:**

- Modify: `apps/server/src/routes/v1/client-routes.ts`

- [ ] **Step 1: Add audit calls after create, update, delete**

After `CreateClient.execute()` succeeds:

```ts
auditCreate({
  request,
  entityType: 'Client',
  entityId: client.id,
  after: client,
})
```

After `UpdateClient.execute()` succeeds (capture `before`):

```ts
// before use case: const before = await getClient...
auditUpdate({
  request,
  entityType: 'Client',
  entityId: id,
  before: existing,
  after: updated,
})
```

After `DeleteClient.execute()` succeeds:

```ts
auditDelete({ request, entityType: 'Client', entityId: id })
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add audit logging to client routes"
```

---

## Task 3: Wire Audit Logging into Proposal Routes

**Files:**

- Modify: `apps/server/src/routes/v1/proposal-routes.ts`

- [ ] **Step 1: Add audit calls (5 operations)**

- `POST /proposals` -> `auditCreate` (entityType: 'Proposal')
- `POST /proposals/:id/advance` -> `auditUpdate` (after: { stage: result.stage })
- `POST /proposals/:id/revert` -> `auditUpdate` (after: { stage: result.stage })
- `POST /proposals/:id/lost` -> `auditUpdate` (after: { stage: 'LOST' })
- `PUT /proposals/:id/details` -> `auditUpdate`

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add audit logging to proposal routes"
```

---

## Task 4: Wire Audit Logging into Policy, Claim, Commission Routes

**Files:**

- Modify: `apps/server/src/routes/v1/policy-routes.ts` (issue, cancel)
- Modify: `apps/server/src/routes/v1/claim-routes.ts` (create, update-status, delete)
- Modify: `apps/server/src/routes/v1/commission-routes.ts` (approve-commercial, approve-admin, reject, pay, reverse)

- [ ] **Step 1: Policy routes** - issue -> `auditCreate('Policy')`, cancel -> `auditUpdate('Policy')`
- [ ] **Step 2: Claim routes** - create -> `auditCreate('Claim')`, update-status -> `auditUpdate('Claim')`, delete -> `auditDelete('Claim')`
- [ ] **Step 3: Commission routes** - approve-commercial/admin -> `auditApprove('Commission')`, reject -> `auditReject('Commission')`, pay -> `auditUpdate('Commission')`, reverse -> `auditUpdate('Commission')`
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add audit logging to policy, claim, and commission routes"
```

---

## Task 5: Wire Audit Logging into Remaining Routes

**Files:**

- Modify: `apps/server/src/routes/v1/endorsement-routes.ts` (create)
- Modify: `apps/server/src/routes/v1/assistance-routes.ts` (create, update-status)
- Modify: `apps/server/src/routes/v1/document-routes.ts` (upload, delete)
- Modify: `apps/server/src/routes/v1/insurer-routes.ts` (create)

- [ ] **Step 1: Add audit calls to all 5 operations**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add audit logging to endorsement, assistance, document, and insurer routes"
```

---

## Task 6: Remove Orphaned ProposalChecklistItem Model

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

The `ProposalChecklistItem` model has zero application code (no use cases, no routes, no frontend). Remove it to keep the schema clean.

- [ ] **Step 1: Remove the model from schema**

Remove the `ProposalChecklistItem` model and the `checklistItems` relation from the `Proposal` model.

- [ ] **Step 2: Regenerate Prisma client**

```bash
cd packages/db && DATABASE_URL="postgresql://localhost:5432/test" pnpm db:generate
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove orphaned ProposalChecklistItem model from schema"
```

---

## Task 7: Quality Gates

- [ ] **Step 1: Run lint** `pnpm lint`
- [ ] **Step 2: Run typecheck** `pnpm typecheck`
- [ ] **Step 3: Run build** `pnpm build`
- [ ] **Step 4: Verify audit log page shows data** (Playwright QA)
