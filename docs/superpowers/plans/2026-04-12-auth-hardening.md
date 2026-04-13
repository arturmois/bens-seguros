# Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 19 auth/authz issues identified in the flow quality audit, delivered across 3 sequential PRs.

**Architecture:** Three sequential PRs: PR 1 (backend security fixes), PR 2 (RBAC unification + chat auth), PR 3 (frontend hardening). Each PR is independently testable and reviewable.

**Tech Stack:** Fastify 5, Better Auth 1.0, CASL, jsonwebtoken, Redis (ioredis), Next.js 16, React 19, Zod

**Spec:** `docs/superpowers/specs/2026-04-12-auth-hardening-design.md`

---

## File Structure

### PR 1: Backend Security (9 issues)

| Action | File                                                                     | Responsibility                                |
| ------ | ------------------------------------------------------------------------ | --------------------------------------------- |
| Modify | `apps/server/src/middlewares/auth-rate-limit.ts`                         | Fix query string bypass                       |
| Modify | `apps/server/src/middlewares/internal-auth-middleware.ts`                | Factory fn + nonce store                      |
| Modify | `apps/server/src/middlewares/subscription-guard.ts`                      | Factory fns + Redis cache                     |
| Modify | `apps/server/src/app.ts`                                                 | Wire factory fns, move internal auth to group |
| Modify | `apps/server/src/routes/internal/leads/index.ts`                         | Remove per-plugin auth                        |
| Modify | `apps/server/src/routes/internal/billing/index.ts`                       | Remove per-plugin auth                        |
| Modify | `packages/auth/src/abilities.ts`                                         | Add `approveCommercial`, fix COMMERCIAL       |
| Modify | `apps/server/src/routes/v1/commissions/approve-commercial.ts`            | Use new action                                |
| Modify | `packages/auth/src/index.ts`                                             | $transaction + email verification fix         |
| Modify | `apps/server/src/routes/auth-routes.ts`                                  | Use fromNodeHeaders                           |
| Modify | `apps/server/src/routes/v1/chat/create-chat-token.ts`                    | Add algorithm to jwt.sign                     |
| Modify | `apps/server/src/middlewares/__tests__/internal-auth-middleware.spec.ts` | Add nonce test                                |

### PR 2: RBAC Unification + Chat Auth (5 issues)

| Action | File                                                                 | Responsibility             |
| ------ | -------------------------------------------------------------------- | -------------------------- |
| Create | `apps/web/src/features/auth/hooks/use-ability.ts`                    | CASL hook for frontend     |
| Modify | `apps/web/src/components/layout/sidebar.tsx`                         | Use useAbility             |
| Modify | `apps/web/src/features/clients/components/client-detail.tsx`         | Use useAbility             |
| Delete | `apps/web/src/lib/permissions.ts`                                    | Remove duplicate RBAC      |
| Modify | `packages/auth/src/abilities.spec.ts`                                | Full role matrix test      |
| Modify | `packages/env/src/index.ts`                                          | Add WIDGET_JWT_SECRET      |
| Modify | `apps/chat-server/src/infra/http/middleware/widget-auth.ts`          | Use WIDGET_JWT_SECRET      |
| Create | `apps/chat-server/src/infra/shared/chat-jwt.ts`                      | Shared JWT schema + verify |
| Modify | `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts` | Import from shared         |
| Modify | `apps/chat-server/src/infra/socket/socket-auth.ts`                   | Import from shared         |
| Modify | `apps/server/src/routes/v1/chat/create-chat-token.ts`                | TTL 2h                     |
| Modify | `apps/web/src/features/chat/lib/chat-api.ts`                         | Token refresh logic        |
| Modify | 5 vitest configs + 2 .env.example files                              | Add WIDGET_JWT_SECRET      |

### PR 3: Frontend Hardening (5 issues)

| Action | File                                                            | Responsibility               |
| ------ | --------------------------------------------------------------- | ---------------------------- |
| Create | `apps/web/src/middleware.ts`                                    | Server-side route protection |
| Modify | `apps/web/src/components/layout/dashboard-shell.tsx`            | Auth check + redirect        |
| Modify | `apps/web/src/features/org/hooks/use-orgs.ts`                   | Use Orval hook               |
| Modify | `apps/web/src/features/auth/hooks/use-auth.ts`                  | Fix invitation redirect      |
| Create | `apps/web/src/features/auth/components/password-input.tsx`      | Shared password toggle       |
| Modify | `apps/web/src/features/auth/components/login-form.tsx`          | Use PasswordInput            |
| Modify | `apps/web/src/features/auth/components/register-form.tsx`       | Use PasswordInput            |
| Modify | `apps/web/src/features/auth/components/reset-password-form.tsx` | Use PasswordInput            |

---

## PR 1: Backend Security

### Task 1: Fix rate limiter query string bypass (MW-003)

**Files:**

- Modify: `apps/server/src/middlewares/auth-rate-limit.ts:89-93`

- [ ] **Step 1: Fix the URL matching to strip query string**

In `apps/server/src/middlewares/auth-rate-limit.ts`, replace the URL matching logic:

```ts
// OLD (line 89-93):
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const matchedPath = AUTH_RATE_LIMIT_PATHS.find((p) =>
      request.url.endsWith(p.suffix)
    )

// NEW:
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const pathname = request.url.split('?')[0] ?? request.url
    const matchedPath = AUTH_RATE_LIMIT_PATHS.find((p) =>
      pathname.endsWith(p.suffix)
    )
```

- [ ] **Step 2: Run existing tests**

```bash
pnpm --filter @app/server test
```

Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/middlewares/auth-rate-limit.ts
git commit -m "fix(auth): strip query string before rate limit path matching (MW-003)"
```

---

### Task 2: Move internalAuthMiddleware to group level (MW-001)

**Files:**

- Modify: `apps/server/src/middlewares/internal-auth-middleware.ts`
- Modify: `apps/server/src/app.ts:330-351`
- Modify: `apps/server/src/routes/internal/leads/index.ts:3,13`
- Modify: `apps/server/src/routes/internal/billing/index.ts:3,8`

- [ ] **Step 1: Add internalAuthMiddleware import and hook to app.ts internal group**

In `apps/server/src/app.ts`, add the import if not already present:

```ts
import { internalAuthMiddleware } from './middlewares/internal-auth-middleware.js'
```

Then in the internal route group (around line 330), add the preHandler hook:

```ts
// Internal API routes (HMAC-authenticated, no session required)
await app.register(async (internalApp) => {
  await internalApp.register(rateLimit, {
    // ... existing rate limit config unchanged ...
  })
  internalApp.addHook('preHandler', internalAuthMiddleware)
  await internalApp.register(internalLeadRoutes)
  await internalApp.register(internalBillingRoutes)
})
```

- [ ] **Step 2: Remove per-plugin internalAuthMiddleware from leads/index.ts**

In `apps/server/src/routes/internal/leads/index.ts`, remove line 3 (import) and line 13 (addHook):

```ts
import type { FastifyInstance } from 'fastify'

import { createInternalClaimRoute } from './create-claim.js'
import { createLeadRoute } from './create-lead.js'
import { listInternalPoliciesRoute } from './list-policies.js'
import { listInternalProposalsRoute } from './list-proposals.js'
import { searchClientsRoute } from './search-clients.js'
import { updateClientRoute } from './update-client.js'
import { updateInternalProposalDetailsRoute } from './update-proposal-details.js'

export async function internalLeadRoutes(app: FastifyInstance) {
  createLeadRoute(app)
  searchClientsRoute(app)
  updateClientRoute(app)
  createInternalClaimRoute(app)
  listInternalProposalsRoute(app)
  listInternalPoliciesRoute(app)
  updateInternalProposalDetailsRoute(app)
}
```

- [ ] **Step 3: Remove per-plugin internalAuthMiddleware from billing/index.ts**

In `apps/server/src/routes/internal/billing/index.ts`, remove line 3 (import) and line 8 (addHook):

```ts
import type { FastifyInstance } from 'fastify'

import { checkUsageRoute } from './check-usage.js'
import { recordUsageRoute } from './record-usage.js'

export async function internalBillingRoutes(app: FastifyInstance) {
  checkUsageRoute(app)
  recordUsageRoute(app)
}
```

- [ ] **Step 4: Run internal auth middleware tests**

```bash
pnpm --filter @app/server exec vitest run src/middlewares/__tests__/internal-auth-middleware.spec.ts
```

Expected: PASS — behavior is unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/app.ts apps/server/src/routes/internal/leads/index.ts apps/server/src/routes/internal/billing/index.ts
git commit -m "refactor(auth): move internalAuthMiddleware to group level (MW-001)"
```

---

### Task 3: Add HMAC nonce store for replay protection (MW-004)

**Files:**

- Modify: `apps/server/src/middlewares/internal-auth-middleware.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/src/middlewares/__tests__/internal-auth-middleware.spec.ts`

- [ ] **Step 1: Convert internalAuthMiddleware to factory function**

Replace `apps/server/src/middlewares/internal-auth-middleware.ts` entirely:

```ts
import { createHash } from 'node:crypto'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@repo/env'
import { verifyRequest } from '@repo/shared'
import type IORedis from 'ioredis'
import pino from 'pino'

const logger = pino({ name: 'internal-auth' })

function headerAsString(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === 'string') return value
  return undefined
}

export function createInternalAuthMiddleware(redis: IORedis) {
  return async function internalAuthMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const signature = headerAsString(request.headers['x-signature'])
    const timestampHeader = headerAsString(request.headers['x-timestamp'])
    const tenantId = headerAsString(request.headers['x-tenant-id'])

    const secret = env.INTERNAL_API_SECRET

    if (!secret) {
      logger.error('INTERNAL_API_SECRET not configured')
      return reply.status(503).send({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Internal API not configured',
        },
      })
    }

    if (!signature || !timestampHeader || !tenantId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing signature, timestamp, or tenant ID',
        },
      })
    }

    const timestamp = Number(timestampHeader)

    if (!Number.isFinite(timestamp)) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid timestamp' },
      })
    }

    const rawBody =
      typeof request.body === 'string'
        ? request.body
        : request.body != null
          ? JSON.stringify(request.body)
          : ''

    const isValid = verifyRequest({
      secret,
      signature,
      method: request.method,
      path: request.url.split('?')[0] ?? request.url,
      tenantId,
      body: rawBody,
      timestamp,
    })

    if (!isValid) {
      logger.warn(
        { method: request.method, url: request.url },
        'Invalid internal API signature'
      )
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Invalid or expired signature' },
      })
    }

    // Replay protection: reject duplicate signatures within the 5-minute window
    const nonceKey = `hmac:nonce:${createHash('sha256').update(signature).digest('hex')}`
    const isNew = await redis.set(nonceKey, '1', 'EX', 300, 'NX')
    if (!isNew) {
      logger.warn(
        { method: request.method, url: request.url },
        'Duplicate HMAC signature (replay detected)'
      )
      return reply.status(403).send({
        success: false,
        error: { code: 'REPLAY_DETECTED', message: 'Duplicate request' },
      })
    }

    request.organizationId = tenantId
  }
}
```

- [ ] **Step 2: Update app.ts to use factory function**

In `apps/server/src/app.ts`, update the import:

```ts
// OLD:
import { internalAuthMiddleware } from './middlewares/internal-auth-middleware.js'
// NEW:
import { createInternalAuthMiddleware } from './middlewares/internal-auth-middleware.js'
```

Then in the internal route group:

```ts
await app.register(async (internalApp) => {
  await internalApp.register(rateLimit, {
    /* ... unchanged ... */
  })
  internalApp.addHook('preHandler', createInternalAuthMiddleware(redis))
  await internalApp.register(internalLeadRoutes)
  await internalApp.register(internalBillingRoutes)
})
```

- [ ] **Step 3: Update tests for factory function and add nonce test**

In `apps/server/src/middlewares/__tests__/internal-auth-middleware.spec.ts`, update to use the factory function. Add a test for replay rejection:

```ts
// After existing tests, add:
it('rejects replayed requests with the same signature', async () => {
  // First request passes
  const firstReply = await sendValidInternalRequest()
  expect(firstReply.statusCode).toBe(200) // or whatever the route returns

  // Same request replayed — should be rejected
  const replayReply = await sendValidInternalRequest() // same headers
  expect(replayReply.statusCode).toBe(403)
  expect(replayReply.json().error.code).toBe('REPLAY_DETECTED')
})
```

Note: The exact test structure depends on the existing test fixtures. Read the existing test file and adapt the Redis mock/setup to support `set` with `NX`.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @app/server exec vitest run src/middlewares/__tests__/internal-auth-middleware.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/middlewares/internal-auth-middleware.ts apps/server/src/app.ts apps/server/src/middlewares/__tests__/internal-auth-middleware.spec.ts
git commit -m "feat(auth): add HMAC nonce store for replay protection (MW-004)"
```

---

### Task 4: Cache loadPlan with Redis (MW-005)

**Files:**

- Modify: `apps/server/src/middlewares/subscription-guard.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/src/routes/webhooks/stripe-webhook.ts`

- [ ] **Step 1: Convert subscription guards to factory functions with Redis caching**

In `apps/server/src/middlewares/subscription-guard.ts`, add Redis parameter and caching:

```ts
import type { SubscriptionRepository } from '@repo/core'
import { container } from '@repo/core'
import {
  PLAN_LIMITS,
  PLAN_TYPE,
  type PlanFeature,
  type PlanType,
} from '@repo/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type IORedis from 'ioredis'
import pino from 'pino'

const logger = pino({ name: 'subscription-guard' })

// ... RESOURCE_TO_LIMIT_KEY, RESOURCE_LABEL, NEXT_PLAN, PLAN_LABEL unchanged ...

const VALID_PLANS = new Set<string>(Object.values(PLAN_TYPE))

function isPlanType(value: string): value is PlanType {
  return VALID_PLANS.has(value)
}

async function loadPlan(
  redis: IORedis,
  organizationId: string
): Promise<PlanType> {
  const cacheKey = `plan:${organizationId}`
  const cached = await redis.get(cacheKey)
  if (cached && isPlanType(cached)) return cached

  const repo = container.resolve<SubscriptionRepository>(
    'SubscriptionRepository'
  )
  const subscription = await repo.findByOrganizationId(organizationId)
  if (!subscription) {
    logger.warn({ organizationId }, 'No subscription found, defaulting to FREE')
    return PLAN_TYPE.FREE
  }
  await redis.set(cacheKey, subscription.plan, 'EX', 60)
  return subscription.plan
}

export function createRequirePlanFeature(redis: IORedis) {
  return function requirePlanFeature(feature: PlanFeature) {
    return async function featureGuard(
      request: FastifyRequest,
      reply: FastifyReply
    ) {
      const { organizationId } = request

      if (!organizationId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'No active organization selected',
          },
        })
      }

      const plan = await loadPlan(redis, organizationId)
      const planFeatures = PLAN_LIMITS[plan].features as readonly string[]

      if (planFeatures.includes(feature)) {
        return
      }

      const requiredPlan = NEXT_PLAN[plan]
      const requiredPlanLabel = PLAN_LABEL[requiredPlan]

      request.log.warn(
        { organizationId, plan, feature, requiredPlan },
        'Plan feature not available'
      )

      return reply.status(402).send({
        success: false,
        error: {
          code: 'PLAN_FEATURE_NOT_AVAILABLE',
          message: `Este recurso requer o plano ${requiredPlanLabel}`,
          requiredPlan,
        },
      })
    }
  }
}

export function createRequirePlanLimit(redis: IORedis) {
  return function requirePlanLimit(
    resource: LimitedResource,
    countFn: (organizationId: string) => Promise<number>
  ) {
    return async function limitGuard(
      request: FastifyRequest,
      reply: FastifyReply
    ) {
      const { organizationId } = request

      if (!organizationId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'No active organization selected',
          },
        })
      }

      const plan = await loadPlan(redis, organizationId)
      const limitKey = RESOURCE_TO_LIMIT_KEY[resource]
      const limit = PLAN_LIMITS[plan][limitKey] as number

      if (limit === -1) {
        return
      }

      const current = await countFn(organizationId)

      if (current < limit) {
        return
      }

      const label = RESOURCE_LABEL[resource]

      request.log.warn(
        { organizationId, plan, resource, limit, current },
        'Plan limit reached'
      )

      return reply.status(403).send({
        success: false,
        error: {
          code: 'PLAN_LIMIT_REACHED',
          message: `Limite do plano atingido: máximo de ${limit} ${label}`,
          limit,
          current,
        },
      })
    }
  }
}

export function invalidatePlanCache(
  redis: IORedis,
  organizationId: string
): Promise<number> {
  return redis.del(`plan:${organizationId}`)
}
```

- [ ] **Step 2: Update app.ts to wire factory functions**

Find all imports and usages of `requirePlanFeature` and `requirePlanLimit` in `app.ts` and route files. These are used in individual route files, so they need to be available via the DI container or as module-level instances. The simplest approach: create the instances once in `app.ts` after Redis is created, and register them in the container or export via a module-level variable.

Check how routes currently import these — they likely import directly from `subscription-guard.ts`. The factory approach means the routes need access to the Redis-backed instances. Store them in `container-registrations.ts` or create them in `app.ts` and pass them through.

Read all files that import from `subscription-guard.ts` and update their imports accordingly.

- [ ] **Step 3: Add cache invalidation to Stripe webhook**

In `apps/server/src/routes/webhooks/stripe-webhook.ts`, add the import and call `invalidatePlanCache` after each subscription mutation:

```ts
import { invalidatePlanCache } from '../../middlewares/subscription-guard.js'
```

In each handler (`handleCheckoutCompleted`, `handleInvoicePaid`, `handleInvoicePaymentFailed`, `handleSubscriptionDeleted`), after the `subscriptionRepo.updateByOrganizationId()` call, add:

```ts
await invalidatePlanCache(redis, organizationId)
```

The Redis instance needs to be passed to these handlers or to the webhook route. Read the webhook file to determine the best injection point.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @app/server test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/middlewares/subscription-guard.ts apps/server/src/app.ts apps/server/src/routes/webhooks/stripe-webhook.ts
git commit -m "perf(auth): cache subscription plan in Redis with invalidation (MW-005)"
```

---

### Task 5: Dual-control commission approval (AUTH-001)

**Files:**

- Modify: `packages/auth/src/abilities.ts:8,80`
- Modify: `apps/server/src/routes/v1/commissions/approve-commercial.ts:21`

- [ ] **Step 1: Add approveCommercial action to abilities.ts**

In `packages/auth/src/abilities.ts`, add `'approveCommercial'` to the `Action` type (line 8):

```ts
export type Action =
  | 'manage'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'approveCommercial'
```

- [ ] **Step 2: Update COMMERCIAL role abilities**

In `packages/auth/src/abilities.ts`, replace the COMMERCIAL case (line 78-84):

```ts
    case 'COMMERCIAL':
      can(['create', 'read', 'update'], ['Client', 'Proposal'])
      can('read', ['Policy', 'Claim'])
      can('read', 'Commission')
      can('approveCommercial', 'Commission')
      can(['read', 'create'], 'Document')
      can('read', 'Notification')
      can('read', 'Member')
      break
```

- [ ] **Step 3: Grant approveCommercial to ADMIN and MANAGER too**

In the ADMIN case (after line 59, `can('approve', 'Commission')`), add:

```ts
can('approveCommercial', 'Commission')
```

In the MANAGER case (after line 70, `can('approve', 'Commission')`), add:

```ts
can('approveCommercial', 'Commission')
```

OWNER already has `can('manage', 'all')` which covers everything.

- [ ] **Step 4: Update approve-commercial route guard**

In `apps/server/src/routes/v1/commissions/approve-commercial.ts`, change line 21:

```ts
    // OLD:
    preHandler: [requireAbility('approve', 'Commission')],
    // NEW:
    preHandler: [requireAbility('approveCommercial', 'Commission')],
```

The `approve-admin.ts` route keeps `requireAbility('approve', 'Commission')` — unchanged.

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @repo/auth test
pnpm --filter @app/server test
```

Expected: PASS (existing abilities.spec.ts tests may need updating — the COMMERCIAL test at line 33-39 doesn't check commission approval, so it should still pass).

- [ ] **Step 6: Commit**

```bash
git add packages/auth/src/abilities.ts apps/server/src/routes/v1/commissions/approve-commercial.ts
git commit -m "fix(auth): enforce dual-control commission approval — COMMERCIAL can only approve own step (AUTH-001)"
```

---

### Task 6: Wrap trial subscription in $transaction (AUTH-002)

**Files:**

- Modify: `packages/auth/src/index.ts:137-168`

- [ ] **Step 1: Replace sequential creates with interactive transaction**

In `packages/auth/src/index.ts`, replace the `afterCreateOrganization` hook body (lines ~137-168):

```ts
        organizationHooks: {
          afterCreateOrganization: async ({ organization: newOrg }) => {
            try {
              const trialEndsAt = new Date()
              trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS)

              await prisma.$transaction(async (tx) => {
                const subscription = await tx.subscription.create({
                  data: {
                    organizationId: newOrg.id,
                    plan: 'PRO',
                    status: 'TRIALING',
                    trialEndsAt,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: trialEndsAt,
                  },
                })

                await tx.aiUsage.create({
                  data: {
                    organizationId: newOrg.id,
                    subscriptionId: subscription.id,
                    periodStart: new Date(),
                    periodEnd: trialEndsAt,
                    messagesIncluded: TRIAL_AI_MESSAGES,
                  },
                })
              })
            } catch (err: unknown) {
              logger.error(
                { err, organizationId: newOrg.id },
                'Failed to create trial subscription and AI usage during org creation'
              )
              throw err
            }
          },
        },
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @repo/auth test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/index.ts
git commit -m "fix(auth): wrap trial subscription creation in $transaction (AUTH-002)"
```

---

### Task 7: Use fromNodeHeaders + fix email verification + explicit JWT algorithm (LIB-001, LIB-005, CHAT-003)

**Files:**

- Modify: `apps/server/src/routes/auth-routes.ts:17-28`
- Modify: `packages/auth/src/index.ts:74`
- Modify: `apps/server/src/routes/v1/chat/create-chat-token.ts:33`

- [ ] **Step 1: Replace manual headers construction with fromNodeHeaders**

In `apps/server/src/routes/auth-routes.ts`:

```ts
import type { Auth } from '@repo/auth'
import type { FastifyInstance } from 'fastify'
import type IORedis from 'ioredis'
import { fromNodeHeaders } from 'better-auth/node'
import { createAuthRateLimitHook } from '../middlewares/auth-rate-limit.js'

export function registerAuthRoutes(
  app: FastifyInstance,
  auth: Auth,
  redis: IORedis
) {
  const authRateLimitHook = createAuthRateLimitHook(redis)

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    preHandler: authRateLimitHook,
    async handler(request, reply) {
      const url = new URL(request.url, `http://${request.headers.host}`)

      const headers = fromNodeHeaders(request.headers)

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      })

      const response = await auth.handler(req)

      reply.status(response.status)
      response.headers.forEach((value, key) => reply.header(key, value))

      const text = await response.text()
      return reply.send(text || null)
    },
  })
}
```

- [ ] **Step 2: Fix requireEmailVerification condition**

In `packages/auth/src/index.ts`, change line 74:

```ts
    // OLD:
    requireEmailVerification: isProduction || !!emailSenders,
    // NEW:
    requireEmailVerification: env.NODE_ENV !== 'development',
```

- [ ] **Step 3: Add explicit algorithm to jwt.sign for chat token**

In `apps/server/src/routes/v1/chat/create-chat-token.ts`, line 33:

```ts
// OLD:
const token = jwt.sign(
  { userId, organizationId, role, name },
  env.SOCKET_JWT_SECRET,
  {
    expiresIn: '24h',
  }
)

// NEW:
const token = jwt.sign(
  { userId, organizationId, role, name },
  env.SOCKET_JWT_SECRET,
  {
    expiresIn: '24h',
    algorithm: 'HS256',
  }
)
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm typecheck
pnpm --filter @app/server test
pnpm --filter @repo/auth test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/auth-routes.ts packages/auth/src/index.ts apps/server/src/routes/v1/chat/create-chat-token.ts
git commit -m "fix(auth): use fromNodeHeaders, secure email verification, explicit JWT algorithm (LIB-001, LIB-005, CHAT-003)"
```

---

### Task 8: PR 1 quality gates + branch + PR

- [ ] **Step 1: Run all quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Expected: All pass.

- [ ] **Step 2: Create branch and PR**

```bash
git checkout -b fix/auth-hardening-backend
git push -u origin fix/auth-hardening-backend
```

Create PR with title: `fix(auth): backend security hardening (9 issues)` targeting `main`.

---

## PR 2: RBAC Unification + Chat Auth

### Task 9: Create useAbility hook and replace permissions.ts (CROSS-001, AUTH-004)

**Files:**

- Create: `apps/web/src/features/auth/hooks/use-ability.ts`
- Modify: `apps/web/src/components/layout/sidebar.tsx:6,124,128`
- Modify: `apps/web/src/features/clients/components/client-detail.tsx:30,49-52`
- Delete: `apps/web/src/lib/permissions.ts`

- [ ] **Step 1: Add @casl/ability to web app**

```bash
pnpm --filter @app/web add @casl/ability
```

- [ ] **Step 2: Create useAbility hook**

Create `apps/web/src/features/auth/hooks/use-ability.ts`:

```ts
import { useMemo } from 'react'
import {
  defineAbilitiesFor,
  type AppAbility,
  type Action,
  type Subject,
} from '@repo/auth/abilities'
import { useOrgs } from '@/features/org/hooks/use-orgs'

export function useAbility(): AppAbility | null {
  const { activeOrg } = useOrgs()
  return useMemo(() => {
    if (!activeOrg) return null
    return defineAbilitiesFor(activeOrg.role)
  }, [activeOrg])
}

export function useHasPermission(action: Action, subject: Subject): boolean {
  const ability = useAbility()
  return ability?.can(action, subject) ?? false
}
```

- [ ] **Step 3: Update sidebar.tsx to use useAbility**

In `apps/web/src/components/layout/sidebar.tsx`:

Replace import:

```ts
// OLD:
import { hasPermission } from '@/lib/permissions'
// NEW:
import { useAbility } from '@/features/auth/hooks/use-ability'
```

The sidebar currently uses `hasPermission(role, 'clients:read')` syntax with string-based permissions. Update to use CASL's `ability.can(action, subject)`. Each sidebar item's `permission` field needs to be mapped to `(action, subject)` pairs.

Read the full sidebar file to understand the permission field format (e.g., `'clients:read'` → `ability.can('read', 'Client')`). Update the filter logic:

```ts
// OLD:
.filter((item) => !item.permission || hasPermission(role, item.permission))
// NEW:
.filter((item) => !item.permission || ability?.can(item.permission.action, item.permission.subject))
```

This requires changing the sidebar nav items' `permission` field from a string like `'clients:read'` to an object like `{ action: 'read', subject: 'Client' }`. Read the full file to understand the data structure and make the appropriate changes.

- [ ] **Step 4: Update client-detail.tsx to use useAbility**

In `apps/web/src/features/clients/components/client-detail.tsx`:

```ts
// OLD:
import { hasPermission } from '@/lib/permissions'
// ...
const canLgpdDelete = hasPermission(
  activeOrg?.role ?? 'VIEWER',
  'clients:lgpd-delete'
)

// NEW:
import { useAbility } from '@/features/auth/hooks/use-ability'
// ...
const ability = useAbility()
const canLgpdDelete = ability?.can('delete', 'Client') ?? false
```

Note: `clients:lgpd-delete` was only granted to OWNER and ADMIN in the old matrix. In CASL, OWNER has `manage all`, ADMIN has `manage Client` (which includes delete). MANAGER also has `manage Client`. Check if this permission expansion is acceptable — if LGPD delete needs to be more restricted, add a specific CASL subject or action. For now, `delete Client` maps correctly to the existing CASL rules.

- [ ] **Step 5: Search for any other hasPermission usage**

```bash
# Search for remaining imports
grep -r "from '@/lib/permissions'" apps/web/src/ --include="*.ts" --include="*.tsx"
```

If any files remain, update them following the same pattern.

- [ ] **Step 6: Delete permissions.ts**

```bash
rm apps/web/src/lib/permissions.ts
```

- [ ] **Step 7: Run typecheck to verify no broken imports**

```bash
pnpm --filter @app/web typecheck
```

Expected: PASS — no files should still reference `@/lib/permissions`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/auth/hooks/use-ability.ts apps/web/src/components/layout/sidebar.tsx apps/web/src/features/clients/components/client-detail.tsx
git rm apps/web/src/lib/permissions.ts
git commit -m "feat(auth): CASL as single RBAC source of truth, remove PERMISSION_MATRIX (CROSS-001)"
```

---

### Task 10: Expand abilities.spec.ts with full role matrix (AUTH-004)

**Files:**

- Modify: `packages/auth/src/abilities.spec.ts`

- [ ] **Step 1: Expand tests with comprehensive role matrix**

Replace `packages/auth/src/abilities.spec.ts` with a full test suite:

```ts
import { describe, expect, it } from 'vitest'
import { defineAbilitiesFor } from './abilities.js'

describe('CASL Abilities', () => {
  describe('OWNER', () => {
    const ability = defineAbilitiesFor('OWNER')

    it('can manage all', () => {
      expect(ability.can('manage', 'all')).toBe(true)
    })
  })

  describe('ADMIN', () => {
    const ability = defineAbilitiesFor('ADMIN')

    it('can manage operational subjects', () => {
      for (const subject of [
        'Client',
        'Proposal',
        'Policy',
        'Claim',
        'Endorsement',
        'Assistance',
        'Document',
        'Insurer',
      ] as const) {
        expect(ability.can('manage', subject)).toBe(true)
      }
    })

    it('can manage and approve commissions', () => {
      expect(ability.can('manage', 'Commission')).toBe(true)
      expect(ability.can('approve', 'Commission')).toBe(true)
      expect(ability.can('approveCommercial', 'Commission')).toBe(true)
    })

    it('can manage users and read audit logs', () => {
      expect(ability.can('manage', 'User')).toBe(true)
      expect(ability.can('read', 'AuditLog')).toBe(true)
    })

    it('can manage members and invitations', () => {
      expect(ability.can('read', 'Member')).toBe(true)
      expect(ability.can('update', 'Member')).toBe(true)
      expect(ability.can('delete', 'Member')).toBe(true)
      expect(ability.can('create', 'Invitation')).toBe(true)
    })

    it('cannot manage Organization', () => {
      expect(ability.can('manage', 'Organization')).toBe(false)
    })
  })

  describe('MANAGER', () => {
    const ability = defineAbilitiesFor('MANAGER')

    it('can manage operational subjects', () => {
      for (const subject of [
        'Client',
        'Proposal',
        'Policy',
        'Claim',
        'Endorsement',
        'Assistance',
        'Document',
        'Insurer',
      ] as const) {
        expect(ability.can('manage', subject)).toBe(true)
      }
    })

    it('can approve commissions (both steps)', () => {
      expect(ability.can('approve', 'Commission')).toBe(true)
      expect(ability.can('approveCommercial', 'Commission')).toBe(true)
    })

    it('cannot manage Users', () => {
      expect(ability.can('manage', 'User')).toBe(false)
    })

    it('can read members but not update/delete', () => {
      expect(ability.can('read', 'Member')).toBe(true)
      expect(ability.can('update', 'Member')).toBe(false)
    })
  })

  describe('COMMERCIAL', () => {
    const ability = defineAbilitiesFor('COMMERCIAL')

    it('can create/read/update clients and proposals but not delete', () => {
      expect(ability.can('create', 'Client')).toBe(true)
      expect(ability.can('read', 'Client')).toBe(true)
      expect(ability.can('update', 'Client')).toBe(true)
      expect(ability.can('delete', 'Client')).toBe(false)
    })

    it('can read policies and claims but not create', () => {
      expect(ability.can('read', 'Policy')).toBe(true)
      expect(ability.can('read', 'Claim')).toBe(true)
      expect(ability.can('create', 'Policy')).toBe(false)
    })

    it('can approveCommercial but NOT approve (admin step)', () => {
      expect(ability.can('approveCommercial', 'Commission')).toBe(true)
      expect(ability.can('approve', 'Commission')).toBe(false)
    })

    it('can read commissions but not manage', () => {
      expect(ability.can('read', 'Commission')).toBe(true)
      expect(ability.can('update', 'Commission')).toBe(false)
      expect(ability.can('delete', 'Commission')).toBe(false)
    })

    it('cannot access insurers', () => {
      expect(ability.can('read', 'Insurer')).toBe(false)
    })
  })

  describe('VIEWER', () => {
    const ability = defineAbilitiesFor('VIEWER')

    it('can read operational subjects except Insurer', () => {
      for (const subject of [
        'Client',
        'Proposal',
        'Policy',
        'Claim',
        'Endorsement',
        'Assistance',
        'Document',
      ] as const) {
        expect(ability.can('read', subject)).toBe(true)
      }
      expect(ability.can('read', 'Insurer')).toBe(false)
    })

    it('cannot create, update, or delete anything', () => {
      expect(ability.can('create', 'Client')).toBe(false)
      expect(ability.can('update', 'Client')).toBe(false)
      expect(ability.can('delete', 'Client')).toBe(false)
    })

    it('cannot approve commissions', () => {
      expect(ability.can('approve', 'Commission')).toBe(false)
      expect(ability.can('approveCommercial', 'Commission')).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @repo/auth test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/abilities.spec.ts
git commit -m "test(auth): comprehensive role × action × subject matrix test (AUTH-004)"
```

---

### Task 11: Separate JWT secrets for widget (CHAT-001)

**Files:**

- Modify: `packages/env/src/index.ts:18`
- Modify: `apps/chat-server/src/infra/http/middleware/widget-auth.ts:16,36`
- Modify: `.env.example`, `.env.example.prod`
- Modify: 5 vitest configs

- [ ] **Step 1: Add WIDGET_JWT_SECRET to env schema**

In `packages/env/src/index.ts`, add after line 18 (`SOCKET_JWT_SECRET`):

```ts
    WIDGET_JWT_SECRET: z.string().min(16).optional(),
```

Make it optional so existing deployments don't break — fall back to `SOCKET_JWT_SECRET` if not set.

- [ ] **Step 2: Update widget-auth.ts to use WIDGET_JWT_SECRET**

In `apps/chat-server/src/infra/http/middleware/widget-auth.ts`:

```ts
// Add at top of file, after env import:
const WIDGET_SECRET = env.WIDGET_JWT_SECRET ?? env.SOCKET_JWT_SECRET
```

Then replace both usages of `env.SOCKET_JWT_SECRET` with `WIDGET_SECRET`:

```ts
// In signVisitorToken (line 16):
  return jwt.sign(payload, WIDGET_SECRET, { expiresIn: '24h', algorithm: 'HS256' })

// In widgetAuthMiddleware (line 36):
    const decoded: unknown = jwt.verify(token, WIDGET_SECRET, {
```

- [ ] **Step 3: Update .env.example files**

Add after `SOCKET_JWT_SECRET` line in both files:

`.env.example`:

```
WIDGET_JWT_SECRET=your-widget-jwt-secret
```

`.env.example.prod`:

```
WIDGET_JWT_SECRET=
```

- [ ] **Step 4: Update vitest configs**

Add `WIDGET_JWT_SECRET: 'test-widget-secret-16'` to the `env` object in all 5 vitest configs:

- `packages/core/vitest.config.ts`
- `packages/shared/vitest.config.ts`
- `packages/auth/vitest.config.ts`
- `apps/server/vitest.config.ts`
- `apps/chat-server/vitest.config.ts`

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/env/src/index.ts apps/chat-server/src/infra/http/middleware/widget-auth.ts .env.example .env.example.prod packages/core/vitest.config.ts packages/shared/vitest.config.ts packages/auth/vitest.config.ts apps/server/vitest.config.ts apps/chat-server/vitest.config.ts
git commit -m "feat(auth): separate JWT secret for widget tokens (CHAT-001)"
```

---

### Task 12: Extract shared chat JWT schema (CHAT-004) + reduce TTL (CHAT-002)

**Files:**

- Create: `apps/chat-server/src/infra/shared/chat-jwt.ts`
- Modify: `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts`
- Modify: `apps/chat-server/src/infra/socket/socket-auth.ts`
- Modify: `apps/server/src/routes/v1/chat/create-chat-token.ts`

- [ ] **Step 1: Create shared JWT module**

Create `apps/chat-server/src/infra/shared/chat-jwt.ts`:

```ts
import { env } from '@repo/env'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

export const chatUserPayloadSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
  name: z.string(),
})

export type ChatUserPayload = z.infer<typeof chatUserPayloadSchema>

export function verifyChatUserToken(token: string): ChatUserPayload | null {
  try {
    const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET, {
      algorithms: ['HS256'],
    })
    const parsed = chatUserPayloadSchema.safeParse(decoded)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Update chat-auth-middleware.ts to import from shared**

Replace `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import { verifyChatUserToken } from '../shared/chat-jwt.js'

export async function chatAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    await reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token de autenticação ausente' },
    })
    return
  }

  const token = authHeader.slice(7)
  const payload = verifyChatUserToken(token)

  if (!payload) {
    await reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token inválido ou expirado' },
    })
    return
  }

  request.user = {
    userId: payload.userId,
    organizationId: payload.organizationId,
    role: payload.role,
    name: payload.name,
  }
  request.organizationId = payload.organizationId
}
```

- [ ] **Step 3: Update socket-auth.ts to import from shared**

Replace `apps/chat-server/src/infra/socket/socket-auth.ts`:

```ts
import type { Socket } from 'socket.io'
import {
  verifyChatUserToken,
  type ChatUserPayload,
} from '../shared/chat-jwt.js'
import type { AppLogger } from '../logger.js'

export type SocketUserData = ChatUserPayload

export function createSocketAuthMiddleware(logger: AppLogger) {
  return (socket: Socket, next: (err?: Error) => void): void => {
    const token = socket.handshake.auth['token']

    if (typeof token !== 'string') {
      logger.warn('Socket connection rejected: missing token')
      next(new Error('Token de autenticação ausente'))
      return
    }

    const payload = verifyChatUserToken(token)

    if (!payload) {
      logger.warn('Socket connection rejected: invalid token')
      next(new Error('Token inválido ou expirado'))
      return
    }

    socket.data['user'] = payload
    next()
  }
}
```

- [ ] **Step 4: Reduce chat JWT TTL to 2h**

In `apps/server/src/routes/v1/chat/create-chat-token.ts`, change:

```ts
// OLD:
const token = jwt.sign(
  { userId, organizationId, role, name },
  env.SOCKET_JWT_SECRET,
  {
    expiresIn: '24h',
    algorithm: 'HS256',
  }
)

// NEW:
const token = jwt.sign(
  { userId, organizationId, role, name },
  env.SOCKET_JWT_SECRET,
  {
    expiresIn: '2h',
    algorithm: 'HS256',
  }
)
```

- [ ] **Step 5: Add token refresh logic to chat-api.ts**

In `apps/web/src/features/chat/lib/chat-api.ts`, add refresh scheduling:

```ts
let cachedToken: string | null = null
let pendingRequest: Promise<string> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

function scheduleRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer)
  if (!cachedToken) return

  const exp = parseJwtExp(cachedToken)
  if (!exp) return

  const refreshAt = exp - 600 // 10 minutes before expiry
  const delayMs = (refreshAt - Math.floor(Date.now() / 1000)) * 1000

  if (delayMs <= 0) {
    // Token already near expiry — refresh immediately on next call
    cachedToken = null
    return
  }

  refreshTimer = setTimeout(() => {
    cachedToken = null // Force re-fetch on next getChatToken() call
  }, delayMs)
}

export async function getChatToken(): Promise<string> {
  if (cachedToken) return cachedToken
  if (pendingRequest) return pendingRequest

  pendingRequest = api
    .post<{ token: string }>('/api/v1/chat/token', {})
    .then((response) => {
      cachedToken = response.data.token
      pendingRequest = null
      scheduleRefresh()
      return cachedToken
    })
    .catch((error: unknown) => {
      pendingRequest = null
      throw error
    })

  return pendingRequest
}

export function clearChatToken(): void {
  cachedToken = null
  pendingRequest = null
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @app/chat-server test
pnpm typecheck
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/chat-server/src/infra/shared/chat-jwt.ts apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts apps/chat-server/src/infra/socket/socket-auth.ts apps/server/src/routes/v1/chat/create-chat-token.ts apps/web/src/features/chat/lib/chat-api.ts
git commit -m "feat(auth): shared JWT schema, separate widget secret, 2h TTL with refresh (CHAT-002, CHAT-004)"
```

---

### Task 13: PR 2 quality gates + branch + PR

- [ ] **Step 1: Run all quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

- [ ] **Step 2: Create branch and PR**

```bash
git checkout -b feat/rbac-unification-chat-auth
git push -u origin feat/rbac-unification-chat-auth
```

Create PR targeting `main` (or PR 1 branch if not yet merged).

---

## PR 3: Frontend Hardening

### Task 14: Add Next.js middleware for server-side route protection (FE-002)

**Files:**

- Create: `apps/web/src/middleware.ts`

- [ ] **Step 1: Create middleware.ts**

Create `apps/web/src/middleware.ts`:

```ts
import { type NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'better-auth.session_token'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/settings',
  '/onboarding',
  '/select-org',
]
const AUTH_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]
const PUBLIC_PATHS = ['/terms', '/privacy', '/verify-email']

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path)
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)

  // Public routes — always accessible
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Auth routes — redirect to dashboard if already logged in
  if (isAuthRoute(pathname) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protected routes — redirect to login if not logged in
  if (isProtectedRoute(pathname) && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Root path — redirect based on session
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(hasSession ? '/dashboard' : '/login', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Verify with typecheck**

```bash
pnpm --filter @app/web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat(auth): add Next.js middleware for server-side route protection (FE-002)"
```

---

### Task 15: Fix infinite spinner for unauthenticated users (FE-001)

**Files:**

- Modify: `apps/web/src/components/layout/dashboard-shell.tsx`

- [ ] **Step 1: Add auth check to DashboardShell**

Replace `apps/web/src/components/layout/dashboard-shell.tsx`:

```ts
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { type Role, ROLES } from '@repo/auth/roles'
import { AppShell } from '@/components/layout/app-shell'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { TermsAcceptanceModal } from '@/features/legal/components/terms-acceptance-modal'
import { clearActiveOrgCookie } from '@/lib/org-cookie'

const DEFAULT_ROLE: Role = 'VIEWER'

function isRole(value: string): value is Role {
  return Object.values(ROLES).some((role) => role === value)
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { activeOrg, isLoading: orgLoading } = useOrgs()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!orgLoading && !activeOrg) {
      clearActiveOrgCookie()
      router.replace('/select-org')
    }
  }, [authLoading, isAuthenticated, orgLoading, activeOrg, router])

  if (authLoading || orgLoading || !activeOrg) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="text-muted-foreground size-6" />
      </div>
    )
  }

  const rawRole = activeOrg.role
  const role: Role = isRole(rawRole) ? rawRole : DEFAULT_ROLE

  return (
    <>
      <AppShell role={role}>{children}</AppShell>
      <TermsAcceptanceModal />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/dashboard-shell.tsx
git commit -m "fix(auth): redirect unauthenticated users to login instead of infinite spinner (FE-001)"
```

---

### Task 16: Replace raw fetch in use-orgs.ts with Orval (FE-004)

**Files:**

- Modify: `apps/web/src/features/org/hooks/use-orgs.ts`

- [ ] **Step 1: Generate API client (ensure server is running or spec is fresh)**

```bash
pnpm --filter @app/web generate:api
```

- [ ] **Step 2: Find the generated Orval hook for listTenants**

```bash
grep -r "listTenants\|useListTenants" apps/web/src/api/ --include="*.ts" -l
```

Identify the generated hook name and import path.

- [ ] **Step 3: Refactor use-orgs.ts to use Orval hook**

Replace the manual fetch with the Orval-generated hook. The exact implementation depends on the generated hook API. The general pattern:

```ts
'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { setActiveOrgCookie, getActiveOrgCookie } from '@/lib/org-cookie'
import type { Role } from '@repo/auth/roles'
import { useListTenants } from '@/api/endpoints/tenants/tenants' // adjust import path

const VALID_ROLES = new Set<string>([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'COMMERCIAL',
  'VIEWER',
])

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.has(value)
}

export interface Org {
  id: string
  name: string
  slug: string
  logo: string | null
  role: Role
}

export function useOrgs() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { session, isAuthenticated } = useAuth()

  const tenantsQuery = useListTenants({
    query: { enabled: isAuthenticated },
  })

  const orgs: Org[] = (tenantsQuery.data?.data ?? [])
    .filter((item) => isRole(item.role))
    .map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      logo: item.logo ?? null,
      role: item.role as Role,
    }))

  const activeOrgId = session?.activeOrganizationId ?? getActiveOrgCookie()
  const activeOrg = orgs.find((org) => org.id === activeOrgId) ?? null

  const switchOrg = useCallback(
    async (organizationId: string) => {
      await authClient.organization.setActive({ organizationId })
      setActiveOrgCookie(organizationId)
      await queryClient.invalidateQueries()
      router.push('/dashboard')
      router.refresh()
    },
    [queryClient, router]
  )

  return {
    orgs,
    activeOrg,
    isLoading: tenantsQuery.isPending,
    switchOrg,
  }
}
```

Note: The exact Orval hook name and response shape depends on the generated code. Read the generated file to adjust. If `useListTenants` doesn't exist (the endpoint might generate with a different name based on `operationId: 'listTenants'`), search for it.

- [ ] **Step 4: Run typecheck**

```bash
pnpm --filter @app/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/org/hooks/use-orgs.ts
git commit -m "refactor(auth): replace raw fetch with Orval hook in useOrgs (FE-004)"
```

---

### Task 17: Fix handleInvitationAfterLogin redirect (FE-005)

**Files:**

- Modify: `apps/web/src/features/auth/hooks/use-auth.ts:124-152`

- [ ] **Step 1: Fix the function to redirect to /select-org on failure**

In `apps/web/src/features/auth/hooks/use-auth.ts`, replace `handleInvitationAfterLogin`:

```ts
async function handleInvitationAfterLogin(invitationId: string) {
  try {
    const res = await authClient.organization.acceptInvitation({
      invitationId,
    })

    if (!res.error) {
      const member = res.data
      const orgId =
        typeof member === 'object' &&
        member !== null &&
        'organizationId' in member &&
        typeof member.organizationId === 'string'
          ? member.organizationId
          : null

      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId })
        setActiveOrgCookie(orgId)
      }

      await queryClient.invalidateQueries({ queryKey: ['auth'] })
      router.push('/dashboard')
      return
    }
  } catch {
    // Invitation acceptance failed — fall through to safe fallback
  }

  await queryClient.invalidateQueries({ queryKey: ['auth'] })
  router.push('/select-org')
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/auth/hooks/use-auth.ts
git commit -m "fix(auth): redirect to /select-org on invitation failure instead of broken dashboard (FE-005)"
```

---

### Task 18: Extract PasswordInput component (FE-006)

**Files:**

- Create: `apps/web/src/features/auth/components/password-input.tsx`
- Modify: `apps/web/src/features/auth/components/login-form.tsx`
- Modify: `apps/web/src/features/auth/components/register-form.tsx`
- Modify: `apps/web/src/features/auth/components/reset-password-form.tsx`

- [ ] **Step 1: Create PasswordInput component**

Create `apps/web/src/features/auth/components/password-input.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PasswordInputProps {
  readonly id: string
  readonly label: string
  readonly autoComplete: string
  readonly registration: UseFormRegisterReturn
  readonly error?: FieldError
  readonly hint?: string
}

export function PasswordInput({
  id,
  label,
  autoComplete,
  registration,
  error,
  hint,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-slate-400">
        {label}
      </Label>
      <div className="relative">
        <Input
          {...registration}
          type={showPassword ? 'text' : 'password'}
          id={id}
          autoComplete={autoComplete}
          className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Update login-form.tsx**

In `apps/web/src/features/auth/components/login-form.tsx`, replace the password field block with:

```tsx
import { PasswordInput } from './password-input'

// Remove: useState for showPassword, Eye/EyeOff imports

// In the JSX, replace the password div (lines 62-101) with:
;<PasswordInput
  id="password"
  label="Senha"
  autoComplete="current-password"
  registration={form.register('password')}
  error={form.formState.errors.password}
/>
```

Keep the "Esqueceu?" link above the PasswordInput — it sits in its own div before the input.

- [ ] **Step 3: Update register-form.tsx**

Replace both password blocks with PasswordInput. Remove `showPassword`/`showConfirmPassword` state and Eye imports:

```tsx
import { PasswordInput } from './password-input'

// Replace password field:
      <PasswordInput
        id="password"
        label="Senha"
        autoComplete="new-password"
        registration={form.register('password')}
        error={form.formState.errors.password}
        hint="Mínimo de 8 caracteres"
      />

// Replace confirmPassword field:
      <PasswordInput
        id="confirmPassword"
        label="Confirmar Senha"
        autoComplete="new-password"
        registration={form.register('confirmPassword')}
        error={form.formState.errors.confirmPassword}
      />
```

- [ ] **Step 4: Update reset-password-form.tsx**

Same pattern — replace both password blocks with PasswordInput:

```tsx
import { PasswordInput } from './password-input'

      <PasswordInput
        id="password"
        label="Nova Senha"
        autoComplete="new-password"
        registration={form.register('password')}
        error={form.formState.errors.password}
        hint="Mínimo de 8 caracteres"
      />

      <PasswordInput
        id="confirmPassword"
        label="Confirmar Nova Senha"
        autoComplete="new-password"
        registration={form.register('confirmPassword')}
        error={form.formState.errors.confirmPassword}
      />
```

- [ ] **Step 5: Verify line counts**

```bash
wc -l apps/web/src/features/auth/components/register-form.tsx
```

Expected: ~160 lines or less (under the 200-line limit).

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @app/web typecheck
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/auth/components/password-input.tsx apps/web/src/features/auth/components/login-form.tsx apps/web/src/features/auth/components/register-form.tsx apps/web/src/features/auth/components/reset-password-form.tsx
git commit -m "refactor(auth): extract PasswordInput component, reduce register-form below 200 lines (FE-006)"
```

---

### Task 19: PR 3 quality gates + branch + PR

- [ ] **Step 1: Run all quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

- [ ] **Step 2: Create branch and PR**

```bash
git checkout -b feat/frontend-auth-hardening
git push -u origin feat/frontend-auth-hardening
```

Create PR targeting `main`.

- [ ] **Step 3: QA via Playwright MCP**

Test manually:

1. Visit `/dashboard` when logged out → should redirect to `/login`
2. Visit `/login` when logged in → should redirect to `/dashboard`
3. Login flow → should work end-to-end
4. Invitation flow → failed invitation should redirect to `/select-org`
5. Password toggle → should work on all auth forms
