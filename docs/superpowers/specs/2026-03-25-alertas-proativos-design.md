# Design Spec: Alertas Proativos

**Date:** 2026-03-25
**Feature:** F04 - Alertas e Notificacoes Proativas
**Effort:** M (3-5 days)

---

## Goal

Expand the existing notification infrastructure to proactively detect time-sensitive conditions (expiring policies, stalled claims, pending commissions, stagnant proposals) and surface them via in-app notifications, dashboard widget, and sidebar badges. The system must be idempotent (no duplicate alerts) and multi-tenant safe.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  BullMQ: erp-proactive-alerts (cron daily 08:00)        │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ Policy       │ │ Claim        │ │ Commission       │ │
│  │ Expiry Check │ │ Stalled Check│ │ Pending Check    │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────────┘ │
│         │                │                │              │
│  ┌──────┴────────────────┴────────────────┴───────────┐  │
│  │             Idempotency Guard                      │  │
│  │  (skip if Notification exists for entity+type+day) │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────┴──────────┐ ┌────────────────┐  │
│  │ Proposal Stagnant Check         │ │                │  │
│  └──────────────────────┬──────────┘ │                │  │
│                         │            │                │  │
│                    enqueue to        │                │  │
│              erp-notifications ──────┘                │  │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────┐
│  Existing notification-processor     │
│  (creates Notification + sends email)│
└──────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   NotificationBell  Dashboard     Sidebar
   (existing)        AlertsWidget  Badges
                     (new)         (new)
```

**Key decisions:**

- Replaces `erp-policy-expiry` queue with a unified `erp-proactive-alerts` queue that runs all checks in a single daily job.
- Each check function is a standalone module in `apps/worker/src/processors/alerts/`.
- All checks iterate over organizations to ensure `organizationId` is always scoped.
- Notifications are enqueued to the existing `erp-notifications` queue (no new delivery path).

---

## Alert Types

| Alert                  | Type Constant        | Condition                                                                                                       | Entity     | Recipients                        | Severity |
| ---------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------- | -------- |
| Apolice vencendo (30d) | `POLICY_EXPIRING`    | `endDate` in exactly 30 days                                                                                    | Policy     | Salesperson + MANAGER/ADMIN/OWNER | HIGH     |
| Apolice vencendo (15d) | `POLICY_EXPIRING`    | `endDate` in exactly 15 days                                                                                    | Policy     | Salesperson + MANAGER/ADMIN/OWNER | HIGH     |
| Apolice vencendo (7d)  | `POLICY_EXPIRING`    | `endDate` in exactly 7 days                                                                                     | Policy     | Salesperson + MANAGER/ADMIN/OWNER | CRITICAL |
| Sinistro parado        | `CLAIM_STALLED`      | `updatedAt` older than 7 days, status in `REGISTERED`, `IN_ANALYSIS`, `AWAITING_DOCUMENT`, `PENDING_INSPECTION` | Claim      | `assignedToId` + MANAGER          | MEDIUM   |
| Comissao pendente      | `COMMISSION_PENDING` | Status `PENDING_COMMERCIAL`, `createdAt` older than 7 days                                                      | Commission | `salespersonId` + ADMIN/OWNER     | MEDIUM   |
| Proposta estagnada     | `PROPOSAL_STAGNANT`  | `updatedAt` older than 15 days, stage not terminal (`WON`, `LOST`)                                              | Proposal   | `salespersonId` + MANAGER         | LOW      |

**New type constants** to add: `CLAIM_STALLED`, `COMMISSION_PENDING`, `PROPOSAL_STAGNANT`.

The existing `POLICY_EXPIRING` type is reused; the body text already differentiates by days remaining.

---

## Processing Logic

### File structure

```
apps/worker/src/processors/alerts/
  index.ts                       # setupProactiveAlertsProcessor (replaces policy-expiry-processor)
  check-policy-expiry.ts         # checkPoliciesExpiring()
  check-claims-stalled.ts        # checkClaimsStalled()
  check-commissions-pending.ts   # checkCommissionsPending()
  check-proposals-stagnant.ts    # checkProposalsStagnant()
  idempotency.ts                 # hasExistingAlert()
```

### Unified processor (index.ts)

- BullMQ queue: `erp-proactive-alerts`
- Cron: `0 8 * * *` (daily at 08:00 BRT)
- Concurrency: 1
- Fetches all distinct `organizationId` values from the `Organization` table.
- For each organization, runs all four check functions sequentially.
- Each check function receives `organizationId` and the `notificationQueue` handle.

### Check: Policy Expiry (check-policy-expiry.ts)

```
Query: Policy WHERE status=ACTIVE, deletedAt=NULL, endDate between startOfDay(today+N) and endOfDay(today+N)
For N in [30, 15, 7]:
  For each matching policy:
    Guard: skip if alert exists (see Idempotency)
    Enqueue POLICY_EXPIRING to erp-notifications for salesperson
    Enqueue POLICY_EXPIRING to erp-notifications for each MANAGER/ADMIN/OWNER (excluding salesperson)
```

Uses date range `[startOfDay(today + N), endOfDay(today + N)]` instead of the current `<= 30 days` window. This produces exactly-once alerts at each threshold instead of daily repeats.

### Check: Claims Stalled (check-claims-stalled.ts)

```
Query: Claim WHERE status IN (REGISTERED, IN_ANALYSIS, AWAITING_DOCUMENT, PENDING_INSPECTION),
       deletedAt=NULL, updatedAt < (now - 7 days)
For each matching claim:
  Guard: skip if alert exists
  Enqueue CLAIM_STALLED for assignedToId (if set)
  Enqueue CLAIM_STALLED for MANAGER roles
```

Body: `"Sinistro #{claimNumber} sem atualizacao ha {daysSinceUpdate} dias"`

### Check: Commissions Pending (check-commissions-pending.ts)

```
Query: Commission WHERE status=PENDING_COMMERCIAL, createdAt < (now - 7 days)
For each matching commission:
  Guard: skip if alert exists
  Enqueue COMMISSION_PENDING for salespersonId
  Enqueue COMMISSION_PENDING for ADMIN/OWNER roles
```

Body: `"Comissao da apolice {policyNumber} pendente ha {daysPending} dias"`

### Check: Proposals Stagnant (check-proposals-stagnant.ts)

```
Query: Proposal WHERE stage NOT IN (WON, LOST), deletedAt=NULL, updatedAt < (now - 15 days)
For each matching proposal:
  Guard: skip if alert exists
  Enqueue PROPOSAL_STAGNANT for salespersonId
  Enqueue PROPOSAL_STAGNANT for MANAGER roles
```

Body: `"Proposta de {clientName} parada no estagio {stage} ha {daysSinceUpdate} dias"`

---

## Idempotency

A notification is considered a duplicate if all of the following match an existing record:

- `organizationId`
- `entityType`
- `entityId`
- `type`
- `createdAt` falls on the same calendar day (BRT timezone)

### Implementation (idempotency.ts)

```typescript
async function hasExistingAlert(params: {
  organizationId: string
  entityType: string
  entityId: string
  type: string
}): Promise<boolean> {
  const startOfDay = /* today 00:00:00 BRT */
  const endOfDay = /* today 23:59:59 BRT */

  const existing = await prisma.notification.findFirst({
    where: {
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: { id: true },
  })

  return existing !== null
}
```

This ensures that if the cron runs multiple times in a day (manual trigger, retry after failure), no duplicates are created. Different threshold days (30/15/7) naturally produce different dates, so they are not considered duplicates of each other.

### Database index

Add a composite index to support the idempotency check:

```prisma
@@index([organizationId, entityType, entityId, type, createdAt])
```

---

## Frontend Changes

### 1. New notification types in notification-item.tsx

Add icon and color mappings for the three new types:

| Type                 | Icon            | Color             |
| -------------------- | --------------- | ----------------- |
| `CLAIM_STALLED`      | `AlertTriangle` | `text-amber-600`  |
| `COMMISSION_PENDING` | `DollarSign`    | `text-yellow-500` |
| `PROPOSAL_STAGNANT`  | `PauseCircle`   | `text-slate-500`  |

### 2. Sidebar badges

**File:** `apps/web/src/components/layout/sidebar.tsx`

Add a new API endpoint `GET /api/v1/notifications/alert-counts` that returns counts grouped by entity type:

```json
{
  "success": true,
  "data": {
    "Policy": 3,
    "Claim": 2,
    "Commission": 1,
    "Proposal": 0
  }
}
```

**Backend query:** Count unread notifications for the current user where `type` is one of the proactive alert types, grouped by `entityType`.

**Sidebar rendering:** Display a small numeric badge next to menu items:

- "Apolices" shows `Policy` count
- "Sinistros" shows `Claim` count
- "Comissoes" shows `Commission` count
- "Propostas" shows `Proposal` count

Badge only renders when count > 0. Use TanStack Query with `staleTime: 60_000` and `refetchInterval: 60_000` for near-real-time updates without overwhelming the API.

### 3. Dashboard alerts widget

**File:** `apps/web/src/features/dashboard/components/alerts-widget.tsx`

A card in the dashboard grid showing a grouped summary of active (unread) proactive alerts:

```
┌─────────────────────────────────────────────┐
│  Alertas Ativos                             │
│                                             │
│  🔴 3 apolices vencem nos proximos 7 dias   │
│     → Ver apolices                          │
│                                             │
│  🟡 2 sinistros sem atualizacao             │
│     → Ver sinistros                         │
│                                             │
│  🟡 1 comissao pendente ha mais de 7 dias   │
│     → Ver comissoes                         │
│                                             │
│  (Proposta count hidden when 0)             │
└─────────────────────────────────────────────┘
```

**API:** Reuses the same `GET /api/v1/notifications/alert-counts` endpoint. Each row links to the respective module's listing page with a pre-applied filter (e.g., `/policies?filter=expiring`).

**4 UI states:** Empty (no alerts -- show success message), Loading (skeleton), Error (retry button), Success (alert list).

### 4. Replace PoliciesExpiring card

The existing `PoliciesExpiring` dashboard card becomes redundant once the alerts widget covers policy expiry. Remove it and let the alerts widget handle that information.

---

## Acceptance Criteria

- [ ] Daily cron job at 08:00 checks policies expiring at exactly 30, 15, and 7 day marks
- [ ] Daily cron job detects claims with no update in > 7 days (non-terminal status)
- [ ] Daily cron job detects commissions in PENDING_COMMERCIAL for > 7 days
- [ ] Daily cron job detects proposals in same non-terminal stage for > 15 days
- [ ] All checks are scoped by `organizationId` (multi-tenant safe)
- [ ] Idempotency: running the job twice in the same day produces no duplicate notifications
- [ ] New notification types (CLAIM_STALLED, COMMISSION_PENDING, PROPOSAL_STAGNANT) render correctly in NotificationBell dropdown with appropriate icons
- [ ] Sidebar shows numeric badge on Apolices, Sinistros, Comissoes, Propostas menu items when unread alerts exist
- [ ] Dashboard displays AlertsWidget with grouped alert counts and links to filtered listings
- [ ] Pino structured logging on all processor activity (no console.log)
- [ ] Zero `any` types, zero `as` assertions in new code
- [ ] Old `erp-policy-expiry` queue is removed and replaced by `erp-proactive-alerts`
- [ ] Database migration adds idempotency index on Notification table
