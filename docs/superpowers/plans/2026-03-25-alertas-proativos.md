# Alertas Proativos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing notification infrastructure to proactively detect time-sensitive conditions (expiring policies, stalled claims, pending commissions, stagnant proposals) and surface them via in-app notifications, dashboard widget, and sidebar badges. The system must be idempotent (no duplicate alerts) and multi-tenant safe.

**Architecture:** Unified `erp-proactive-alerts` BullMQ cron job (daily 08:00) replaces `erp-policy-expiry`, runs 4 check functions per organization, enqueues to existing `erp-notifications` queue. Frontend adds alert-counts API, sidebar badges, and dashboard alerts widget.

**Tech Stack:** BullMQ 5, Prisma 7, Fastify 5, Pino, React 19, TanStack Query, shadcn/ui, Zod

**Spec:** `docs/superpowers/specs/2026-03-25-alertas-proativos-design.md`

---

## Task 1: Database Migration — Idempotency Index

Add a composite index on the `Notification` table to support the idempotency guard query. Update the type comment.

- [ ] **Step 1.1:** Edit `packages/db/prisma/schema.prisma` — add idempotency index to `Notification` model

In the `Notification` model (line ~523), add after the existing `@@index` lines:

```prisma
@@index([organizationId, entityType, entityId, type, createdAt])
```

Also update the `type` field comment to include the new types:

```prisma
type           String // CLAIM_OPENED, COMMISSION_APPROVED, COMMISSION_REJECTED, POLICY_EXPIRING, INVITATION_ACCEPTED, CLAIM_STALLED, COMMISSION_PENDING, PROPOSAL_STAGNANT
```

- [ ] **Step 1.2:** Generate and apply the migration

```bash
cd /home/artur/projects && pnpm --filter @repo/db exec prisma migrate dev --name add-notification-idempotency-index
```

- [ ] **Step 1.3:** Verify migration applied

```bash
cd /home/artur/projects && pnpm --filter @repo/db exec prisma migrate status
```

- [ ] **Step 1.4:** Commit

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add idempotency composite index on Notification table"
```

---

## Task 2: Idempotency Guard + Alert Check Modules (Worker)

Create the modular check functions and idempotency guard in `apps/worker/src/processors/alerts/`.

- [ ] **Step 2.1:** Create `apps/worker/src/processors/alerts/idempotency.ts`

```typescript
import { prisma } from '@repo/db'

interface HasExistingAlertParams {
  readonly organizationId: string
  readonly entityType: string
  readonly entityId: string
  readonly type: string
}

export async function hasExistingAlert(
  params: HasExistingAlertParams
): Promise<boolean> {
  const now = new Date()
  // BRT = UTC-3
  const brtOffset = -3 * 60
  const brtNow = new Date(
    now.getTime() + (brtOffset + now.getTimezoneOffset()) * 60_000
  )

  const startOfDay = new Date(brtNow)
  startOfDay.setHours(0, 0, 0, 0)
  // Convert back to UTC for DB query
  const startUtc = new Date(
    startOfDay.getTime() - (brtOffset + now.getTimezoneOffset()) * 60_000
  )

  const endOfDay = new Date(brtNow)
  endOfDay.setHours(23, 59, 59, 999)
  const endUtc = new Date(
    endOfDay.getTime() - (brtOffset + now.getTimezoneOffset()) * 60_000
  )

  const existing = await prisma.notification.findFirst({
    where: {
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      createdAt: { gte: startUtc, lte: endUtc },
    },
    select: { id: true },
  })

  return existing !== null
}
```

- [ ] **Step 2.2:** Create `apps/worker/src/processors/alerts/check-policy-expiry.ts`

```typescript
import type { NotificationJobData } from '@repo/core/notification'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { hasExistingAlert } from './idempotency.js'

const THRESHOLDS = [30, 15, 7] as const

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

function severityForDays(days: number): string {
  return days <= 7 ? 'CRITICAL' : 'HIGH'
}

export async function checkPoliciesExpiring(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger
): Promise<void> {
  const now = new Date()

  for (const days of THRESHOLDS) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + days)

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const policies = await prisma.policy.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        deletedAt: null,
        endDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        salesperson: true,
        client: true,
      },
    })

    for (const policy of policies) {
      const isDuplicate = await hasExistingAlert({
        organizationId,
        entityType: 'Policy',
        entityId: policy.id,
        type: 'POLICY_EXPIRING',
      })

      if (isDuplicate) {
        continue
      }

      const severity = severityForDays(days)
      const body = `Apolice ${policy.policyNumber} vence em ${days} dias`
      const title =
        severity === 'CRITICAL'
          ? 'Apolice vencendo em breve!'
          : 'Apolice expirando'

      // Notify salesperson
      if (policy.salespersonId) {
        await notificationQueue.add(
          'notification',
          {
            notification: {
              organizationId,
              userId: policy.salespersonId,
              type: 'POLICY_EXPIRING',
              title,
              body,
              entityType: 'Policy',
              entityId: policy.id,
            },
          },
          DEFAULT_JOB_OPTIONS
        )
      }

      // Notify MANAGER/ADMIN/OWNER (excluding salesperson)
      const managers = await prisma.member.findMany({
        where: {
          organizationId,
          role: { in: ['MANAGER', 'ADMIN', 'OWNER'] },
        },
      })

      for (const manager of managers) {
        if (manager.userId === policy.salespersonId) {
          continue
        }
        await notificationQueue.add(
          'notification',
          {
            notification: {
              organizationId,
              userId: manager.userId,
              type: 'POLICY_EXPIRING',
              title,
              body,
              entityType: 'Policy',
              entityId: policy.id,
            },
          },
          DEFAULT_JOB_OPTIONS
        )
      }

      logger.info(
        { policyId: policy.id, days, severity },
        'Policy expiry alert enqueued'
      )
    }
  }
}
```

- [ ] **Step 2.3:** Create `apps/worker/src/processors/alerts/check-claims-stalled.ts`

```typescript
import type { NotificationJobData } from '@repo/core/notification'
import { prisma } from '@repo/db'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { hasExistingAlert } from './idempotency.js'

const STALLED_DAYS = 7
const STALLED_STATUSES = [
  'REGISTERED',
  'IN_ANALYSIS',
  'AWAITING_DOCUMENT',
  'PENDING_INSPECTION',
] as const

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

export async function checkClaimsStalled(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger
): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - STALLED_DAYS)

  const claims = await prisma.claim.findMany({
    where: {
      organizationId,
      status: { in: [...STALLED_STATUSES] },
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
  })

  for (const claim of claims) {
    const isDuplicate = await hasExistingAlert({
      organizationId,
      entityType: 'Claim',
      entityId: claim.id,
      type: 'CLAIM_STALLED',
    })

    if (isDuplicate) {
      continue
    }

    const daysSinceUpdate = Math.floor(
      (Date.now() - claim.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const body = `Sinistro #${claim.claimNumber} sem atualizacao ha ${daysSinceUpdate} dias`

    // Notify assignedTo if set
    if (claim.assignedToId) {
      await notificationQueue.add(
        'notification',
        {
          notification: {
            organizationId,
            userId: claim.assignedToId,
            type: 'CLAIM_STALLED',
            title: 'Sinistro parado',
            body,
            entityType: 'Claim',
            entityId: claim.id,
          },
        },
        DEFAULT_JOB_OPTIONS
      )
    }

    // Notify MANAGERs
    const managers = await prisma.member.findMany({
      where: {
        organizationId,
        role: 'MANAGER',
      },
    })

    for (const manager of managers) {
      if (manager.userId === claim.assignedToId) {
        continue
      }
      await notificationQueue.add(
        'notification',
        {
          notification: {
            organizationId,
            userId: manager.userId,
            type: 'CLAIM_STALLED',
            title: 'Sinistro parado',
            body,
            entityType: 'Claim',
            entityId: claim.id,
          },
        },
        DEFAULT_JOB_OPTIONS
      )
    }

    logger.info(
      { claimId: claim.id, daysSinceUpdate },
      'Claim stalled alert enqueued'
    )
  }
}
```

- [ ] **Step 2.4:** Create `apps/worker/src/processors/alerts/check-commissions-pending.ts`

```typescript
import type { NotificationJobData } from '@repo/core/notification'
import { prisma } from '@repo/db'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { hasExistingAlert } from './idempotency.js'

const PENDING_DAYS = 7

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

export async function checkCommissionsPending(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger
): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PENDING_DAYS)

  const commissions = await prisma.commission.findMany({
    where: {
      organizationId,
      status: 'PENDING_COMMERCIAL',
      createdAt: { lt: cutoff },
    },
    include: {
      policy: true,
    },
  })

  for (const commission of commissions) {
    const isDuplicate = await hasExistingAlert({
      organizationId,
      entityType: 'Commission',
      entityId: commission.id,
      type: 'COMMISSION_PENDING',
    })

    if (isDuplicate) {
      continue
    }

    const daysPending = Math.floor(
      (Date.now() - commission.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const policyNumber = commission.policy?.policyNumber ?? 'N/A'
    const body = `Comissao da apolice ${policyNumber} pendente ha ${daysPending} dias`

    // Notify salesperson
    await notificationQueue.add(
      'notification',
      {
        notification: {
          organizationId,
          userId: commission.salespersonId,
          type: 'COMMISSION_PENDING',
          title: 'Comissao pendente',
          body,
          entityType: 'Commission',
          entityId: commission.id,
        },
      },
      DEFAULT_JOB_OPTIONS
    )

    // Notify ADMIN/OWNER
    const admins = await prisma.member.findMany({
      where: {
        organizationId,
        role: { in: ['ADMIN', 'OWNER'] },
      },
    })

    for (const admin of admins) {
      if (admin.userId === commission.salespersonId) {
        continue
      }
      await notificationQueue.add(
        'notification',
        {
          notification: {
            organizationId,
            userId: admin.userId,
            type: 'COMMISSION_PENDING',
            title: 'Comissao pendente',
            body,
            entityType: 'Commission',
            entityId: commission.id,
          },
        },
        DEFAULT_JOB_OPTIONS
      )
    }

    logger.info(
      { commissionId: commission.id, daysPending },
      'Commission pending alert enqueued'
    )
  }
}
```

- [ ] **Step 2.5:** Create `apps/worker/src/processors/alerts/check-proposals-stagnant.ts`

**Important:** The Prisma schema uses `POLICY_ISSUED` and `LOST` as terminal stages (not `WON`). The check must exclude both terminal stages.

```typescript
import type { NotificationJobData } from '@repo/core/notification'
import { prisma } from '@repo/db'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { hasExistingAlert } from './idempotency.js'

const STAGNANT_DAYS = 15
const TERMINAL_STAGES = ['POLICY_ISSUED', 'LOST'] as const

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

export async function checkProposalsStagnant(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger
): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - STAGNANT_DAYS)

  const proposals = await prisma.proposal.findMany({
    where: {
      organizationId,
      stage: { notIn: [...TERMINAL_STAGES] },
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
    include: {
      client: true,
    },
  })

  for (const proposal of proposals) {
    const isDuplicate = await hasExistingAlert({
      organizationId,
      entityType: 'Proposal',
      entityId: proposal.id,
      type: 'PROPOSAL_STAGNANT',
    })

    if (isDuplicate) {
      continue
    }

    const daysSinceUpdate = Math.floor(
      (Date.now() - proposal.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const clientName = proposal.client?.name ?? 'N/A'
    const body = `Proposta de ${clientName} parada no estagio ${proposal.stage} ha ${daysSinceUpdate} dias`

    // Notify salesperson
    await notificationQueue.add(
      'notification',
      {
        notification: {
          organizationId,
          userId: proposal.salespersonId,
          type: 'PROPOSAL_STAGNANT',
          title: 'Proposta estagnada',
          body,
          entityType: 'Proposal',
          entityId: proposal.id,
        },
      },
      DEFAULT_JOB_OPTIONS
    )

    // Notify MANAGERs
    const managers = await prisma.member.findMany({
      where: {
        organizationId,
        role: 'MANAGER',
      },
    })

    for (const manager of managers) {
      if (manager.userId === proposal.salespersonId) {
        continue
      }
      await notificationQueue.add(
        'notification',
        {
          notification: {
            organizationId,
            userId: manager.userId,
            type: 'PROPOSAL_STAGNANT',
            title: 'Proposta estagnada',
            body,
            entityType: 'Proposal',
            entityId: proposal.id,
          },
        },
        DEFAULT_JOB_OPTIONS
      )
    }

    logger.info(
      { proposalId: proposal.id, daysSinceUpdate, stage: proposal.stage },
      'Proposal stagnant alert enqueued'
    )
  }
}
```

- [ ] **Step 2.6:** Commit

```bash
git add apps/worker/src/processors/alerts/
git commit -m "feat(worker): add idempotency guard and 4 alert check modules"
```

---

## Task 3: Unified Proactive Alerts Processor + Remove Old Policy Expiry

Create the unified processor that replaces `erp-policy-expiry` and wires up all 4 checks.

- [ ] **Step 3.1:** Create `apps/worker/src/processors/alerts/index.ts`

```typescript
import type { NotificationJobData } from '@repo/core/notification'
import { prisma } from '@repo/db'
import type { ConnectionOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'
import { checkClaimsStalled } from './check-claims-stalled.js'
import { checkCommissionsPending } from './check-commissions-pending.js'
import { checkPoliciesExpiring } from './check-policy-expiry.js'
import { checkProposalsStagnant } from './check-proposals-stagnant.js'

const logger = pino({ name: 'proactive-alerts-processor' })

const QUEUE_NAME = 'erp-proactive-alerts'

export function setupProactiveAlertsProcessor(
  connection: ConnectionOptions,
  notificationQueue: Queue<NotificationJobData>
) {
  const queue = new Queue(QUEUE_NAME, { connection })

  queue.upsertJobScheduler(
    'proactive-alerts-daily',
    { pattern: '0 8 * * *' },
    { name: 'check-all-alerts' }
  )

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      logger.info('Starting proactive alerts check')

      const organizations = await prisma.organization.findMany({
        select: { id: true },
      })

      for (const org of organizations) {
        const orgLogger = logger.child({ organizationId: org.id })

        try {
          await checkPoliciesExpiring(org.id, notificationQueue, orgLogger)
        } catch (err: unknown) {
          orgLogger.error({ err }, 'Policy expiry check failed')
        }

        try {
          await checkClaimsStalled(org.id, notificationQueue, orgLogger)
        } catch (err: unknown) {
          orgLogger.error({ err }, 'Claims stalled check failed')
        }

        try {
          await checkCommissionsPending(org.id, notificationQueue, orgLogger)
        } catch (err: unknown) {
          orgLogger.error({ err }, 'Commissions pending check failed')
        }

        try {
          await checkProposalsStagnant(org.id, notificationQueue, orgLogger)
        } catch (err: unknown) {
          orgLogger.error({ err }, 'Proposals stagnant check failed')
        }

        orgLogger.info('Completed all checks for organization')
      }

      logger.info(
        { organizationCount: organizations.length },
        'Proactive alerts check completed'
      )
    },
    {
      connection,
      concurrency: 1,
      maxStalledCount: 2,
      stalledInterval: 5_000,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86_400 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Proactive alerts job failed')
  })

  return { worker, queue }
}
```

- [ ] **Step 3.2:** Delete old processor file

```bash
rm apps/worker/src/processors/policy-expiry-processor.ts
```

- [ ] **Step 3.3:** Update `apps/worker/src/index.ts` — replace `setupPolicyExpiryProcessor` with `setupProactiveAlertsProcessor`

Replace the import:

```typescript
// OLD:
import { setupPolicyExpiryProcessor } from './processors/policy-expiry-processor.js'
// NEW:
import { setupProactiveAlertsProcessor } from './processors/alerts/index.js'
```

Replace the setup call:

```typescript
// OLD:
const policyExpiry = setupPolicyExpiryProcessor(connection, notifications.queue)
// NEW:
const proactiveAlerts = setupProactiveAlertsProcessor(
  connection,
  notifications.queue
)
```

Update log message:

```typescript
// OLD:
logger.info(
  'ERP Worker started. Active processors: audit-archive, notifications, policy-expiry'
)
// NEW:
logger.info(
  'ERP Worker started. Active processors: audit-archive, notifications, proactive-alerts'
)
```

Update `gracefulShutdown` — replace all `policyExpiry` references with `proactiveAlerts`:

```typescript
await Promise.all([
  auditArchive.worker.close(),
  notifications.worker.close(),
  proactiveAlerts.worker.close(),
])
await Promise.all([
  auditArchive.queue.close(),
  notifications.queue.close(),
  proactiveAlerts.queue.close(),
])
```

- [ ] **Step 3.4:** Verify typecheck

```bash
cd /home/artur/projects && pnpm typecheck
```

- [ ] **Step 3.5:** Commit

```bash
git add apps/worker/
git commit -m "feat(worker): replace policy-expiry with unified proactive-alerts processor"
```

---

## Task 4: Backend — Alert Counts API Endpoint

Add `GET /api/v1/notifications/alert-counts` that returns unread proactive alert counts grouped by entity type.

- [ ] **Step 4.1:** Add `countAlertsByEntityType` method to `NotificationRepository` interface

In `packages/core/src/modules/notification/domain/notification-repository.ts`, add:

```typescript
countAlertsByEntityType(
  organizationId: string,
  userId: string,
  types: readonly string[]
): Promise<Record<string, number>>
```

- [ ] **Step 4.2:** Implement in `PrismaNotificationRepository`

In `packages/core/src/modules/notification/infrastructure/prisma-notification-repository.ts`, add the method:

```typescript
async countAlertsByEntityType(
  organizationId: string,
  userId: string,
  types: readonly string[]
): Promise<Record<string, number>> {
  const results = await this.prisma.notification.groupBy({
    by: ['entityType'],
    where: {
      organizationId,
      userId,
      read: false,
      type: { in: [...types] },
      entityType: { not: null },
    },
    _count: { id: true },
  })

  const counts: Record<string, number> = {
    Policy: 0,
    Claim: 0,
    Commission: 0,
    Proposal: 0,
  }

  for (const row of results) {
    if (row.entityType) {
      counts[row.entityType] = row._count.id
    }
  }

  return counts
}
```

- [ ] **Step 4.3:** Create use case `CountAlertsByEntityType`

Create `packages/core/src/modules/notification/application/count-alerts-by-entity-type.ts`:

```typescript
import { injectable, inject } from 'tsyringe'
import type { NotificationRepository } from '../domain/notification-repository.js'

const PROACTIVE_ALERT_TYPES = [
  'POLICY_EXPIRING',
  'CLAIM_STALLED',
  'COMMISSION_PENDING',
  'PROPOSAL_STAGNANT',
] as const

@injectable()
export class CountAlertsByEntityType {
  constructor(
    @inject('NotificationRepository')
    private readonly repo: NotificationRepository
  ) {}

  async execute(
    organizationId: string,
    userId: string
  ): Promise<Record<string, number>> {
    return this.repo.countAlertsByEntityType(
      organizationId,
      userId,
      PROACTIVE_ALERT_TYPES
    )
  }
}
```

- [ ] **Step 4.4:** Export from `packages/core/src/modules/notification/index.ts`

Add:

```typescript
export { CountAlertsByEntityType } from './application/count-alerts-by-entity-type.js'
```

- [ ] **Step 4.5:** Register in DI container

Find the DI container registration file (likely `packages/core/src/container.ts` or similar) and register `CountAlertsByEntityType` the same way other notification use cases are registered.

- [ ] **Step 4.6:** Add route to `apps/server/src/routes/v1/notification-routes.ts`

Add this route after the existing `unread-count` route:

```typescript
// GET /api/v1/notifications/alert-counts
app.get(
  '/api/v1/notifications/alert-counts',
  { preHandler: [requireAbility('read', 'Notification')] },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const useCase = container.resolve(CountAlertsByEntityType)
    const result = await useCase.execute(
      request.organizationId!,
      request.user!.id
    )
    return reply.send({ success: true, data: result })
  }
)
```

Update the imports at the top to include `CountAlertsByEntityType`.

- [ ] **Step 4.7:** Verify typecheck

```bash
cd /home/artur/projects && pnpm typecheck
```

- [ ] **Step 4.8:** Commit

```bash
git add packages/core/src/modules/notification/ apps/server/src/routes/v1/notification-routes.ts
git commit -m "feat(api): add GET /notifications/alert-counts endpoint for proactive alerts"
```

---

## Task 5: Frontend — New Notification Types in NotificationItem

Add icon/color mappings for the 3 new alert types.

- [ ] **Step 5.1:** Edit `apps/web/src/features/notifications/components/notification-item.tsx`

Add new imports to the lucide-react import:

```typescript
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  DollarSign,
  FileWarning,
  PauseCircle,
  UserCheck,
  XCircle,
} from 'lucide-react'
```

Add entries to `ICON_MAP`:

```typescript
CLAIM_STALLED: AlertTriangle,
COMMISSION_PENDING: DollarSign,
PROPOSAL_STAGNANT: PauseCircle,
```

Add entries to `COLOR_MAP`:

```typescript
CLAIM_STALLED: 'text-amber-600',
COMMISSION_PENDING: 'text-yellow-500',
PROPOSAL_STAGNANT: 'text-slate-500',
```

- [ ] **Step 5.2:** Commit

```bash
git add apps/web/src/features/notifications/components/notification-item.tsx
git commit -m "feat(web): add icon and color mappings for proactive alert notification types"
```

---

## Task 6: Frontend — Sidebar Alert Badges

Add numeric badges to sidebar menu items showing unread proactive alert counts.

- [ ] **Step 6.1:** Create hook `apps/web/src/features/notifications/hooks/use-alert-counts.ts`

```typescript
'use client'

import { api } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

interface AlertCounts {
  readonly Policy: number
  readonly Claim: number
  readonly Commission: number
  readonly Proposal: number
}

export function useAlertCounts() {
  return useQuery({
    queryKey: ['notifications', 'alert-counts'],
    queryFn: async () => {
      const res = await api.get<AlertCounts>(
        '/api/v1/notifications/alert-counts'
      )
      return res.data
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}
```

- [ ] **Step 6.2:** Edit `apps/web/src/components/layout/sidebar.tsx` — add badge support

Add import at top:

```typescript
import { useAlertCounts } from '@/features/notifications/hooks/use-alert-counts'
```

Create a mapping from href to entity type, placed after the `SECONDARY_NAV` constant:

```typescript
const ALERT_BADGE_MAP: Record<string, string> = {
  '/policies': 'Policy',
  '/claims': 'Claim',
  '/commissions': 'Commission',
  '/proposals': 'Proposal',
}
```

Update `SidebarNav` to accept and pass `alertCounts`:

In the `Sidebar` component function body, add the hook call:

```typescript
const { data: alertCounts } = useAlertCounts()
```

Pass `alertCounts` through `SidebarNav` to `NavItem`. Update the `SidebarNav` props interface to include `alertCounts?: Record<string, number>`. In each `NavItem` render, compute the badge count from `alertCounts` and `ALERT_BADGE_MAP[item.href]`.

Update `NavItem` to accept an optional `badgeCount` prop. When `badgeCount > 0` and not collapsed, render a badge:

```tsx
{
  badgeCount > 0 && !collapsed && (
    <span className="bg-destructive text-destructive-foreground ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
      {badgeCount > 99 ? '99+' : badgeCount}
    </span>
  )
}
```

When collapsed and `badgeCount > 0`, render a small dot indicator:

```tsx
{
  badgeCount > 0 && collapsed && (
    <span className="bg-destructive absolute -right-0.5 -top-0.5 size-2 rounded-full" />
  )
}
```

For collapsed mode, wrap the `NavItem` `Link` content in a `relative` container to position the dot.

- [ ] **Step 6.3:** Verify typecheck

```bash
cd /home/artur/projects && pnpm typecheck
```

- [ ] **Step 6.4:** Commit

```bash
git add apps/web/src/features/notifications/hooks/use-alert-counts.ts apps/web/src/components/layout/sidebar.tsx
git commit -m "feat(web): add proactive alert badge counts to sidebar menu items"
```

---

## Task 7: Frontend — Dashboard Alerts Widget + Replace PoliciesExpiring

Create the `AlertsWidget` component and replace the old `PoliciesExpiring` card.

- [ ] **Step 7.1:** Create `apps/web/src/features/dashboard/components/alerts-widget.tsx`

```typescript
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlertCounts } from '@/features/notifications/hooks/use-alert-counts'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  PauseCircle,
} from 'lucide-react'
import Link from 'next/link'

interface AlertRow {
  readonly entityType: string
  readonly label: string
  readonly icon: React.ElementType
  readonly color: string
  readonly badgeVariant: 'destructive' | 'warning' | 'secondary'
  readonly href: string
  readonly zeroLabel: string
}

const ALERT_ROWS: readonly AlertRow[] = [
  {
    entityType: 'Policy',
    label: 'apolices vencendo',
    icon: Clock,
    color: 'text-orange-500',
    badgeVariant: 'destructive',
    href: '/policies?filter=expiring',
    zeroLabel: 'apolices expirando',
  },
  {
    entityType: 'Claim',
    label: 'sinistros sem atualizacao',
    icon: AlertTriangle,
    color: 'text-amber-600',
    badgeVariant: 'warning',
    href: '/claims?filter=stalled',
    zeroLabel: 'sinistros parados',
  },
  {
    entityType: 'Commission',
    label: 'comissoes pendentes ha mais de 7 dias',
    icon: DollarSign,
    color: 'text-yellow-500',
    badgeVariant: 'warning',
    href: '/commissions?filter=pending',
    zeroLabel: 'comissoes pendentes',
  },
  {
    entityType: 'Proposal',
    label: 'propostas estagnadas',
    icon: PauseCircle,
    color: 'text-slate-500',
    badgeVariant: 'secondary',
    href: '/proposals?filter=stagnant',
    zeroLabel: 'propostas estagnadas',
  },
] as const

export function AlertsWidget() {
  const { data: alertCounts, isLoading, isError, refetch } = useAlertCounts()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alertas Ativos</CardTitle>
        </CardHeader>
        <CardPanel className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardPanel>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alertas Ativos</CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-col items-center gap-2 py-6">
          <AlertTriangle className="text-destructive size-6" />
          <p className="text-muted-foreground text-sm">
            Erro ao carregar alertas.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </CardPanel>
      </Card>
    )
  }

  const counts = alertCounts ?? { Policy: 0, Claim: 0, Commission: 0, Proposal: 0 }
  const totalAlerts = Object.values(counts).reduce((sum, c) => sum + c, 0)

  if (totalAlerts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alertas Ativos</CardTitle>
        </CardHeader>
        <CardPanel className="flex items-center gap-3 py-6">
          <CheckCircle2 className="text-emerald-500 size-6" />
          <p className="text-muted-foreground text-sm">
            Nenhum alerta ativo. Tudo em dia!
          </p>
        </CardPanel>
      </Card>
    )
  }

  const activeRows = ALERT_ROWS.filter(
    (row) => (counts[row.entityType as keyof typeof counts] ?? 0) > 0
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Alertas Ativos</CardTitle>
      </CardHeader>
      <CardPanel className="space-y-3">
        {activeRows.map((row) => {
          const count = counts[row.entityType as keyof typeof counts] ?? 0
          const Icon = row.icon
          return (
            <div key={row.entityType} className="flex items-center gap-3">
              <Icon className={`size-4 shrink-0 ${row.color}`} />
              <span className="text-sm">
                <span className="font-semibold">{count}</span> {row.label}
              </span>
              <Link
                href={row.href}
                className="text-primary ml-auto text-xs hover:underline"
              >
                Ver {row.entityType === 'Policy' ? 'apolices' : row.entityType === 'Claim' ? 'sinistros' : row.entityType === 'Commission' ? 'comissoes' : 'propostas'}
              </Link>
            </div>
          )
        })}
      </CardPanel>
    </Card>
  )
}
```

- [ ] **Step 7.2:** Edit `apps/web/src/features/dashboard/components/dashboard-content.tsx`

Remove the `PoliciesExpiring` import and usage. Replace it with `AlertsWidget`.

Remove:

```typescript
import { PoliciesExpiring } from './policies-expiring'
```

Add dynamic import:

```typescript
const AlertsWidget = dynamic(
  () => import('./alerts-widget').then((m) => m.AlertsWidget),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
)
```

Replace in the grid (the `lg:grid-cols-3` section):

```tsx
// OLD:
<PoliciesExpiring count={data?.expiringPolicies} isLoading={isLoading} />
// NEW:
<AlertsWidget />
```

- [ ] **Step 7.3:** Do NOT delete `policies-expiring.tsx` yet — keep it as a fallback. It can be removed in a follow-up cleanup after QA confirms the widget works.

- [ ] **Step 7.4:** Verify typecheck

```bash
cd /home/artur/projects && pnpm typecheck
```

- [ ] **Step 7.5:** Commit

```bash
git add apps/web/src/features/dashboard/components/
git commit -m "feat(web): add AlertsWidget to dashboard, replacing PoliciesExpiring card"
```

---

## Task 8: Testing + Final Verification

Verify the full pipeline works: typecheck, lint, build.

- [ ] **Step 8.1:** Run typecheck across the monorepo

```bash
cd /home/artur/projects && pnpm typecheck
```

- [ ] **Step 8.2:** Run lint

```bash
cd /home/artur/projects && pnpm lint
```

Fix any lint issues (ensure zero `console.log`, zero `any`, zero `eslint-disable`).

- [ ] **Step 8.3:** Run build

```bash
cd /home/artur/projects && pnpm build
```

- [ ] **Step 8.4:** Run existing tests to ensure no regressions

```bash
cd /home/artur/projects && pnpm test
```

- [ ] **Step 8.5:** Manually verify the old `erp-policy-expiry` queue reference is fully removed

```bash
cd /home/artur/projects && grep -r "policy-expiry" apps/ packages/ --include="*.ts" --include="*.tsx"
```

Should return zero results.

- [ ] **Step 8.6:** Verify new files follow naming conventions (kebab-case) and no file exceeds 200 lines

```bash
wc -l apps/worker/src/processors/alerts/*.ts
wc -l apps/web/src/features/dashboard/components/alerts-widget.tsx
```

- [ ] **Step 8.7:** Final commit (if any fixes were needed)

```bash
git add -A
git commit -m "fix: address lint/typecheck issues from proactive alerts implementation"
```

- [ ] **Step 8.8:** Run code review agent

Invoke `superpowers:code-reviewer` on all changed files to verify SOLID, Clean Code, Object Calisthenics, security, and adherence to CLAUDE.md.

- [ ] **Step 8.9:** Run QA via Playwright MCP

Test the following flows:

1. Dashboard loads with AlertsWidget showing correct states (empty, with data)
2. Sidebar badges appear next to relevant menu items when alerts exist
3. Notification bell dropdown shows new alert types with correct icons/colors
4. Clicking "Ver apolices/sinistros/comissoes/propostas" links navigates correctly

---

## Notes for Implementer

- **ProposalStage caveat:** The spec says terminal stages are `WON` and `LOST`, but the Prisma schema uses `POLICY_ISSUED` and `LOST`. The check in `check-proposals-stagnant.ts` must use `POLICY_ISSUED` instead of `WON`.
- **`deletedAt` on Commission:** The Commission model has `deletedAt` but the spec query does not filter on it. Consider adding `deletedAt: null` to the commission query for safety if soft-deletes are used.
- **BRT timezone in idempotency:** The guard uses BRT (UTC-3) for day boundaries. If the server runs in UTC, the offset calculation handles the conversion. Verify this matches production timezone expectations.
- **`env.FRONTEND_URL`:** The old policy-expiry processor used `env.FRONTEND_URL` for email links. The new checks do not send emails directly (they rely on the notification processor). If email templates are needed for new alert types, add them as a follow-up task.
