# Fase 7: Dashboard & Polish - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard com metricas operacionais + financeiras, audit log com archive, Bull Board, Sentry, E2E tests (Playwright 5 fluxos criticos), polish final.

**Architecture:** Dashboard usa Server Components com dados agregados do PostgreSQL. Audit log archive via job do worker (cron mensal). Bull Board embeddido no server. Sentry em todas apps. Playwright testa fluxos criticos.

**Tech Stack:** Recharts/Chart.js, Playwright, Sentry, Bull Board, BullMQ repeatable jobs.

**Spec:** `/home/artur/projects/ESPECIFICACAO-FINAL.md` (Secoes 8.10, 8.12, 12, 13)

**Depends on:** Fase 4 (Financial) + Fase 5 (Chat)

---

## File Structure

```
packages/db/prisma/schema.prisma        # Add AuditLogArchive model

apps/server/src/
├── routes/v1/
│   ├── stats-routes.ts                  # Dashboard metrics
│   └── audit-log-routes.ts
├── handlers/
│   ├── stats.handlers.ts
│   └── audit-log.handlers.ts
├── bull-board.ts                        # Bull Board setup

apps/worker/src/processors/
├── audit-archive-processor.ts           # Monthly archive job
└── media-migration-processor.ts         # Migrate chat media to R2 (90 days)

apps/web/src/
├── app/(dashboard)/
│   ├── page.tsx                         # Dashboard home
│   └── audit/
│       └── page.tsx
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── stats-cards.tsx
│   │   │   ├── proposals-by-stage.tsx
│   │   │   ├── policies-expiring.tsx
│   │   │   ├── claims-by-priority.tsx
│   │   │   ├── commissions-summary.tsx
│   │   │   ├── conversion-rate.tsx
│   │   │   └── trend-chart.tsx
│   │   └── hooks/
│   │       └── use-dashboard-stats.ts
│   └── audit/
│       ├── components/
│       │   ├── audit-table.tsx
│       │   └── audit-detail-modal.tsx
│       └── hooks/
│           └── use-audit-logs.ts

e2e/
├── playwright.config.ts
├── fixtures/
│   └── auth.fixture.ts
└── tests/
    ├── auth.spec.ts
    ├── proposal-to-policy.spec.ts
    ├── claim.spec.ts
    ├── commission.spec.ts
    └── chat.spec.ts
```

---

## Task 1: Dashboard API Endpoints

**Files:**

- Create: `apps/server/src/routes/v1/stats-routes.ts`
- Create: `apps/server/src/handlers/stats.handlers.ts`
- Create: `apps/server/src/schemas/stats.schemas.ts`

- [ ] **Step 1: Create stats handlers with aggregation queries**

```ts
import { prisma } from '@repo/db';
import type { FastifyRequest, FastifyReply } from 'fastify';

export async function handleGetDashboardStats(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.organizationId;
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

  const [
    proposalsByStage,
    activePolicies,
    expiringPolicies,
    claimsByPriority,
    commissionsThisMonth,
    conversionRate,
    monthlyTrends,
  ] = await Promise.all([
    // Proposals by stage (excluding terminal)
    prisma.proposal.groupBy({
      by: ['stage'],
      where: {
        organizationId: orgId,
        deletedAt: null,
        stage: { notIn: ['POLICY_ISSUED', 'LOST'] },
      },
      _count: true,
    }),

    // Active policies count
    prisma.policy.count({
      where: { organizationId: orgId, status: 'ACTIVE', deletedAt: null },
    }),

    // Policies expiring in 30 days
    prisma.policy.count({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
        endDate: { lte: thirtyDaysFromNow, gte: now },
        deletedAt: null,
      },
    }),

    // Open claims by priority
    prisma.claim.groupBy({
      by: ['priority'],
      where: {
        organizationId: orgId,
        status: { notIn: ['COMPLETED', 'REJECTED'] },
        deletedAt: null,
      },
      _count: true,
    }),

    // Commissions this month
    prisma.commission.groupBy({
      by: ['status'],
      where: {
        organizationId: orgId,
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        deletedAt: null,
      },
      _sum: { commissionValueInCents: true },
      _count: true,
    }),

    // Conversion rate (proposals -> policies, last 6 months)
    Promise.all([
      prisma.proposal.count({
        where: { organizationId: orgId, createdAt: { gte: sixMonthsAgo }, deletedAt: null },
      }),
      prisma.proposal.count({
        where: {
          organizationId: orgId,
          stage: 'POLICY_ISSUED',
          createdAt: { gte: sixMonthsAgo },
          deletedAt: null,
        },
      }),
    ]).then(([total, issued]) => ({
      total,
      issued,
      rate: total > 0 ? Math.round((issued / total) * 100) : 0,
    })),

    // Monthly trends (last 6 months - proposals created + policies issued)
    prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
        COUNT(*) FILTER (WHERE "stage" != 'LOST') as proposals,
        COUNT(*) FILTER (WHERE "stage" = 'POLICY_ISSUED') as issued
      FROM "Proposal"
      WHERE "organizationId" = ${orgId}
        AND "createdAt" >= ${sixMonthsAgo}
        AND "deletedAt" IS NULL
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month
    `,
  ]);

  return reply.send({
    success: true,
    data: {
      proposalsByStage,
      activePolicies,
      expiringPolicies,
      claimsByPriority,
      commissionsThisMonth,
      conversionRate,
      monthlyTrends,
    },
  });
}
```

- [ ] **Step 2: Create stats routes**

```
GET /api/v1/stats/dashboard  - all dashboard metrics
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/stats-routes.ts apps/server/src/handlers/stats.handlers.ts apps/server/src/schemas/stats.schemas.ts
git commit -m "feat: add dashboard stats API with aggregation queries"
```

---

## Task 2: Dashboard Frontend

- [ ] **Step 1: Create stats-cards (4 key numbers)**

Propostas ativas | Apolices ativas (+ expirando badge) | Sinistros abertos | Comissoes pendentes

- [ ] **Step 2: Create proposals-by-stage bar chart**
- [ ] **Step 3: Create policies-expiring warning list**
- [ ] **Step 4: Create claims-by-priority donut chart**
- [ ] **Step 5: Create commissions-summary (pending vs paid this month)**
- [ ] **Step 6: Create conversion-rate card (percentage + trend)**
- [ ] **Step 7: Create trend-chart (line chart, 6 months)**
- [ ] **Step 8: Assemble dashboard page**

```tsx
export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <StatsCards />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProposalsByStage />
        <CommissionsSummary />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ConversionRate />
        <ClaimsByPriority />
        <PoliciesExpiring />
      </div>
      <TrendChart />
    </div>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/dashboard/ apps/web/src/app/\(dashboard\)/page.tsx
git commit -m "feat: add dashboard with stats cards, charts, and trend visualization"
```

---

## Task 3: Audit Log System

**Files:**

- Modify: `packages/db/prisma/schema.prisma` (add AuditLog + AuditLogArchive)
- Create: `packages/core/src/modules/audit/`
- Create: `apps/server/src/routes/v1/audit-log-routes.ts`

- [ ] **Step 1: Add AuditLog model**

```prisma
model AuditLog {
  id              String    @id @default(cuid())
  organizationId  String
  userId          String?
  action          String    // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT
  entityType      String    // Client, Proposal, Policy, etc.
  entityId        String?
  before          Json?
  after           Json?
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime  @default(now())

  @@index([organizationId, entityType, createdAt(sort: Desc)])
  @@index([organizationId, action])
  @@index([organizationId, userId])
}

model AuditLogArchive {
  id              String    @id @default(cuid())
  organizationId  String
  userId          String?
  action          String
  entityType      String
  entityId        String?
  before          Json?
  after           Json?
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime
  archivedAt      DateTime  @default(now())

  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 2: Create audit helper utility**

```ts
import { prisma } from '@repo/db';

interface AuditEntry {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({ data: entry });
}

export const logCreate = (base: Omit<AuditEntry, 'action'>) =>
  logAudit({ ...base, action: 'CREATE' });

export const logUpdate = (base: Omit<AuditEntry, 'action'>) =>
  logAudit({ ...base, action: 'UPDATE' });

export const logDelete = (base: Omit<AuditEntry, 'action'>) =>
  logAudit({ ...base, action: 'DELETE' });

export const logApprove = (base: Omit<AuditEntry, 'action'>) =>
  logAudit({ ...base, action: 'APPROVE' });
```

- [ ] **Step 3: Create audit routes**

```
GET /api/v1/audit-logs  - list with filters (entityType, action, userId, dateRange)
```

- [ ] **Step 4: Create audit-archive-processor (worker)**

Monthly cron job: moves audit logs older than 12 months to AuditLogArchive table. Deletes from AuditLog.

```ts
// BullMQ repeatable job - runs 1st of each month at 3am
const archiveJob = new Worker(
  'audit-archive',
  async () => {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

    const logs = await prisma.auditLog.findMany({
      where: { createdAt: { lt: cutoffDate } },
      take: 10000,
    });

    if (logs.length === 0) return;

    await prisma.$transaction([
      prisma.auditLogArchive.createMany({
        data: logs.map((log) => ({
          ...log,
          archivedAt: new Date(),
        })),
      }),
      prisma.auditLog.deleteMany({
        where: { id: { in: logs.map((l) => l.id) } },
      }),
    ]);
  },
  { connection },
);
```

- [ ] **Step 5: Integrate audit logging into existing use cases**

Add `logCreate`, `logUpdate`, `logDelete`, `logApprove` calls to all existing use cases.

- [ ] **Step 6: Create audit frontend (table + detail modal)**
- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add audit log system with archive processor and frontend"
```

---

## Task 4: Bull Board

**Files:**

- Create: `apps/server/src/bull-board.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Setup Bull Board**

```ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export function setupBullBoard(app: import('fastify').FastifyInstance) {
  const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  const queues = [
    'erp-notifications',
    'erp-policy-expiry',
    'erp-audit-archive',
    'chat-send-message',
    'chat-incoming-message',
    'chat-ai-bot',
  ].map((name) => new BullMQAdapter(new Queue(name, { connection })));

  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({ queues, serverAdapter });

  app.register(serverAdapter.registerPlugin(), {
    basePath: '/admin/queues',
    prefix: '/admin/queues',
  });
}
```

- [ ] **Step 2: Register in app.ts (protected by ADMIN role)**
- [ ] **Step 3: Commit**

```bash
git add apps/server/src/bull-board.ts apps/server/src/app.ts
git commit -m "feat: add bull board dashboard for queue monitoring"
```

---

## Task 5: Sentry Integration

**Files:**

- Modify: `apps/web/next.config.ts`
- Create: `apps/web/sentry.client.config.ts`
- Create: `apps/web/sentry.server.config.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/chat-server/src/app.ts`

- [ ] **Step 1: Setup Sentry in web (Next.js)**

```bash
cd apps/web && pnpm add @sentry/nextjs
```

- [ ] **Step 2: Setup Sentry in server (Fastify)**

```ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
  });
}
```

- [ ] **Step 3: Setup Sentry in chat-server**
- [ ] **Step 4: Add Sentry error handler to Fastify**
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add sentry error tracking to all apps"
```

---

## Task 6: Media Migration Processor

**Files:**

- Create: `apps/chat-worker/src/processors/media-migration-processor.ts`

- [ ] **Step 1: Create processor**

Weekly cron: finds Messages with `mediaUrl` (external) older than 90 days, downloads media, uploads to R2, updates `mediaKey`, clears `mediaUrl`.

- [ ] **Step 2: Commit**

```bash
git add apps/chat-worker/
git commit -m "feat: add media migration processor (move chat media to R2 after 90 days)"
```

---

## Task 7: E2E Tests (Playwright)

**Files:**

- Create: `e2e/playwright.config.ts`
- Create: `e2e/fixtures/auth.fixture.ts`
- Create: `e2e/tests/auth.spec.ts`
- Create: `e2e/tests/proposal-to-policy.spec.ts`
- Create: `e2e/tests/claim.spec.ts`
- Create: `e2e/tests/commission.spec.ts`
- Create: `e2e/tests/chat.spec.ts`

- [ ] **Step 1: Setup Playwright**

```bash
pnpm add -Dw @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 2: Create auth fixture (login helper)**

```ts
import { test as base, type Page } from '@playwright/test';

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@bens.com.br');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await use(page);
  },
});
```

- [ ] **Step 3: Test 1 - Auth flow**

```ts
test('login and see dashboard', async ({ authedPage: page }) => {
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

- [ ] **Step 4: Test 2 - Proposal to Policy**

```ts
test('create proposal and advance to policy', async ({ authedPage: page }) => {
  await page.goto('/proposals/new');
  // Fill form, submit
  // Advance through stages
  // Verify policy created
});
```

- [ ] **Step 5: Test 3 - Claim flow**
- [ ] **Step 6: Test 4 - Commission approval**
- [ ] **Step 7: Test 5 - Chat (verify UI loads, send message)**
- [ ] **Step 8: Commit**

```bash
git add e2e/
git commit -m "feat: add playwright e2e tests for 5 critical flows"
```

---

## Task 8: Final Polish and Validation

- [ ] **Step 1: Run all quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

- [ ] **Step 2: Run E2E tests**

```bash
pnpm exec playwright test
```

- [ ] **Step 3: Verify dark mode across all pages**
- [ ] **Step 4: Verify responsive design on mobile viewport**
- [ ] **Step 5: Test Docker production build**

```bash
docker compose -f docker-compose.prod.yml up --build
```

- [ ] **Step 6: Verify Sentry captures errors**
- [ ] **Step 7: Verify Bull Board shows all queues**
- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete dashboard, audit, monitoring, e2e tests - production ready"
```
