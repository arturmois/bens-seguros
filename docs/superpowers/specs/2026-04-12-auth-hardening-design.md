# Auth Hardening Design

**Date:** 2026-04-12
**Origin:** Flow quality audit of authentication & authorization (backend → frontend)
**Scope:** 19 issues across 4 layers, delivered in 3 sequential PRs

## Context

A flow quality audit of the auth/authz system scored **5.5/10**, identifying 6 critical and 13 warning-level issues spanning the auth package, server middleware, frontend auth, chat auth, and cross-layer consistency. This spec addresses all 19 findings.

### Key Decisions

| Decision                           | Choice                                           | Rationale                                                                 |
| ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| AUTH-001: COMMERCIAL + commissions | Dual-control — COMMERCIAL approves own step only | Prevents financial self-approval, preserves existing dual-endpoint design |
| CROSS-001: RBAC source of truth    | CASL is single source, frontend imports directly | Eliminates divergence class entirely, zero manual sync                    |
| CHAT-001: JWT secrets              | Separate secrets (`WIDGET_JWT_SECRET`)           | Cryptographic isolation between token classes                             |
| CHAT-002: JWT stale role           | TTL 2h + silent refresh                          | Reduces window 12x with no infra overhead; revocation can be added later  |
| LIB-005: Email verification        | Bypass only in `NODE_ENV === 'development'`      | Secures staging/production without impacting dev onboarding               |

## Delivery Structure

```
PR 1: Backend Security (9 issues) ─────────────────────┐
  MW-003, MW-001, MW-004, MW-005, AUTH-001,             │
  AUTH-002, LIB-001, LIB-005, CHAT-003                  │
                                                        ▼
PR 2: RBAC Unification + Chat Auth (5 issues) ──────────┐
  CROSS-001, AUTH-004, CHAT-001, CHAT-002, CHAT-004     │
                                                        ▼
PR 3: Frontend Hardening (5 issues)
  FE-001, FE-002, FE-004, FE-005, FE-006
```

Each PR is independently reviewable and testable. PR 2 depends on PR 1 (corrected CASL abilities). PR 3 depends on PR 2 (unified RBAC consumed by frontend).

---

## PR 1: Backend Security

### MW-003 — Fix rate limiter query string bypass

**File:** `apps/server/src/middlewares/auth-rate-limit.ts:90`

`request.url` includes the query string, so `endsWith('/sign-in/email')` fails for `/api/auth/sign-in/email?x=1`. Strip the query string before matching:

```ts
const pathname = request.url.split('?')[0] ?? request.url
const matchedPath = AUTH_RATE_LIMIT_PATHS.find((p) =>
  pathname.endsWith(p.suffix)
)
```

**Test:** Add test case that verifies rate limit triggers with query params appended.

### MW-001 — Move internalAuthMiddleware to group level

**File:** `apps/server/src/app.ts:330-351`

Move `internalAuthMiddleware` from individual sub-plugins to the internal route group:

```ts
await app.register(async (internalApp) => {
  await internalApp.register(rateLimit, { ... })
  internalApp.addHook('preHandler', internalAuthMiddleware)
  await internalApp.register(internalLeadRoutes)
  await internalApp.register(internalBillingRoutes)
})
```

Remove per-plugin `internalAuthMiddleware` registration from `internalLeadRoutes` and `internalBillingRoutes`.

### MW-004 — Add nonce store for HMAC replay protection

**File:** `apps/server/src/middlewares/internal-auth-middleware.ts`

After successful HMAC verification, store `sha256(signature)` in Redis with `SETNX` + 300s TTL. Reject if key already exists:

```ts
const nonceKey = `hmac:nonce:${createHash('sha256').update(signature).digest('hex')}`
const isNew = await redis.set(nonceKey, '1', 'EX', 300, 'NX')
if (!isNew) {
  return reply
    .status(403)
    .send({
      success: false,
      error: { code: 'REPLAY_DETECTED', message: 'Duplicate request' },
    })
}
```

Requires converting `internalAuthMiddleware` to a factory function `createInternalAuthMiddleware(redis)` and updating `app.ts` registration.

### MW-005 — Cache loadPlan with Redis

**File:** `apps/server/src/middlewares/subscription-guard.ts:52-62`

Add Redis cache layer to `loadPlan`:

```ts
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
  const plan = subscription?.plan ?? PLAN_TYPE.FREE
  await redis.set(cacheKey, plan, 'EX', 60)
  return plan
}
```

Invalidation: add `redis.del(`plan:${organizationId}`)` in the Stripe webhook handler when subscription changes.

Requires converting `requirePlanFeature` and `requirePlanLimit` to factory functions that receive Redis (same pattern as `createInternalAuthMiddleware(redis)` in MW-004).

### AUTH-001 — Dual-control commission approval

**Files:** `packages/auth/src/abilities.ts`, `apps/server/src/routes/v1/commissions/approve-commercial.ts`, `apps/server/src/routes/v1/commissions/approve-admin.ts`

1. Add `'approveCommercial'` to the `Action` type in `abilities.ts`
2. COMMERCIAL role: replace `can(['read', 'approve'], 'Commission')` with:
   ```ts
   can('read', 'Commission')
   can('approveCommercial', 'Commission')
   ```
3. MANAGER and ADMIN roles: add `can('approveCommercial', 'Commission')` alongside existing `can('approve', 'Commission')`
4. Update route guards:
   - `approve-commercial.ts` → `requireAbility('approveCommercial', 'Commission')`
   - `approve-admin.ts` → `requireAbility('approve', 'Commission')` (unchanged)

Result: COMMERCIAL can approve their own step but not the admin step. MANAGER+ can approve both.

### AUTH-002 — Wrap trial subscription creation in $transaction

**File:** `packages/auth/src/index.ts:142-168`

Replace sequential creates with an interactive transaction (required because `aiUsage` depends on `subscription.id`):

```ts
await prisma.$transaction(async (tx) => {
  const subscription = await tx.subscription.create({ data: { ... } })
  await tx.aiUsage.create({ data: { subscriptionId: subscription.id, ... } })
})
```

If either write fails, both are rolled back — no orphaned rows.

### LIB-001 — Use fromNodeHeaders from Better Auth

**File:** `apps/server/src/routes/auth-routes.ts:21-24`

Replace manual headers loop:

```ts
import { fromNodeHeaders } from 'better-auth/node'

// In handler:
const headers = fromNodeHeaders(request.headers)
const req = new Request(url.toString(), {
  method: request.method,
  headers,
  ...(request.body ? { body: JSON.stringify(request.body) } : {}),
})
```

### LIB-005 — Require email verification outside development

**File:** `packages/auth/src/index.ts:74`

Change condition from:

```ts
requireEmailVerification: isProduction || !!emailSenders
```

To:

```ts
requireEmailVerification: env.NODE_ENV !== 'development'
```

This secures staging environments that run without an email provider while preserving the dev-local bypass.

### CHAT-003 — Explicit algorithm in jwt.sign

**Files:** `apps/server/src/routes/v1/chat/create-chat-token.ts:33`, `apps/chat-server/src/infra/http/middleware/widget-auth.ts:16`

Add `algorithm: 'HS256'` to both `jwt.sign` calls:

```ts
jwt.sign(payload, secret, { expiresIn: '24h', algorithm: 'HS256' })
```

The TTL remains `'24h'` in this PR — CHAT-002 (PR 2) reduces it to `'2h'`.

Aligns sign-side with verify-side which already enforces `algorithms: ['HS256']`.

---

## PR 2: RBAC Unification + Chat Auth

### CROSS-001 + AUTH-004 — CASL as single source of truth

**Eliminate** `apps/web/src/lib/permissions.ts` entirely. Frontend uses CASL directly.

**Step 1: Create `useAbility` hook**

File: `apps/web/src/features/auth/hooks/use-ability.ts`

```ts
import { useMemo } from 'react'
import { defineAbilitiesFor, type AppAbility } from '@repo/auth/abilities'
import { useOrgs } from '@/features/org/hooks/use-orgs'

export function useAbility(): AppAbility | null {
  const { activeOrg } = useOrgs()
  return useMemo(() => {
    if (!activeOrg) return null
    return defineAbilitiesFor(activeOrg.role)
  }, [activeOrg])
}
```

**Step 2: Replace all `hasPermission` calls**

All occurrences of `hasPermission(role, 'clients:create')` become `ability?.can('create', 'Client')`. Same semantics, now derived from CASL at runtime.

Search pattern: `Grep` for `hasPermission|hasAnyPermission|hasAllPermissions` across `apps/web/src/` to find all call sites.

**Step 3: Delete `permissions.ts`**

Remove `apps/web/src/lib/permissions.ts` and all imports.

**Step 4: Add `@casl/ability` to `apps/web`**

```bash
pnpm --filter @app/web add @casl/ability
```

**Step 5: Comprehensive abilities test**

Add `packages/auth/src/abilities.spec.ts` with full role × action × subject matrix. Serves as documentation and regression net. Tests assertions like:

```ts
it('COMMERCIAL can approveCommercial Commission but not approve', () => {
  const ability = defineAbilitiesFor('COMMERCIAL')
  expect(ability.can('approveCommercial', 'Commission')).toBe(true)
  expect(ability.can('approve', 'Commission')).toBe(false)
})
```

### CHAT-001 — Separate JWT secrets

1. Add `WIDGET_JWT_SECRET` to `packages/env/src/index.ts` (required for chat-server and chat-worker)
2. Update `widget-auth.ts`:
   - `signVisitorToken`: use `env.WIDGET_JWT_SECRET`
   - `widgetAuthMiddleware`: `jwt.verify(token, env.WIDGET_JWT_SECRET, ...)`
3. `chat-auth-middleware.ts` and `socket-auth.ts` remain on `env.SOCKET_JWT_SECRET` (no change)
4. Update `.env.example`, `.env.example.prod`
5. Update vitest configs that require the new env var
6. Generate a new secret value for all environments

### CHAT-002 — Reduce chat JWT TTL to 2h + silent refresh

**Backend:** `apps/server/src/routes/v1/chat/create-chat-token.ts:37`

- Change `expiresIn: '24h'` to `expiresIn: '2h'`

**Frontend:** Chat connection hook (the hook that manages WebSocket connection and chat API calls)

- Before token expires (~10min before), call `POST /api/v1/chat/token` to get a fresh token
- On Socket.IO disconnect/reconnect, use the refreshed token in `auth.token` handshake
- If refresh returns 403 (user removed from org), disconnect and show appropriate message

**Implementation note:** The JWT `exp` claim is accessible client-side via decoding (no verification needed — just read the payload). Schedule refresh at `exp - 600` seconds.

### CHAT-004 — Extract shared JWT schema

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

Update `chat-auth-middleware.ts` and `socket-auth.ts` to import from `chat-jwt.ts`. Delete duplicate schemas. Fix `SocketUserData.role` from `string` to `ChatUserPayload['role']`.

---

## PR 3: Frontend Hardening

### FE-002 — Add Next.js middleware for server-side route protection

Create `apps/web/src/middleware.ts`:

- Check for Better Auth session cookie (`better-auth.session_token`)
- Protected routes (`/dashboard/*`, `/settings/*`, `/onboarding/*`, `/select-org/*`): redirect to `/login` if no cookie
- Auth routes (`/login`, `/register`, `/forgot-password`, `/reset-password`): redirect to `/dashboard` if cookie present
- Public routes (`/terms`, `/privacy`, `/verify-email`): pass-through
- Does NOT validate the token server-side (avoids edge latency). Cookie presence prevents flash-of-content; real validation happens on first API call.

```ts
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### FE-001 — Fix infinite spinner for unauthenticated users

**File:** `apps/web/src/components/layout/dashboard-shell.tsx`

Add auth check before org check:

```ts
const { isAuthenticated, isLoading: authLoading } = useAuth()
const { activeOrg, isLoading: orgLoading } = useOrgs()

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
  return <Spinner />
}
```

With FE-002's middleware, this case only triggers if the session expires during use. Defense-in-depth.

### FE-004 — Replace raw fetch in use-orgs.ts with Orval

1. Verify `GET /api/v1/tenants` has a response schema in its route file (add if missing)
2. Run `pnpm --filter @app/web generate:api`
3. Replace manual `fetch()` + `TenantApiResponse` type guard with Orval-generated hook
4. Remove `TenantResponseData` and `TenantApiResponse` interfaces
5. Keep `isRole()` guard for converting the Orval string type to `Role`
6. Surface errors properly instead of returning empty array

### FE-005 — Fix handleInvitationAfterLogin unconditional redirect

**File:** `apps/web/src/features/auth/hooks/use-auth.ts:124-152`

Move `invalidateQueries` and `router.push` into the success branch. Fallback to `/select-org` on failure:

```ts
async function handleInvitationAfterLogin(invitationId: string) {
  try {
    const res = await authClient.organization.acceptInvitation({ invitationId })
    if (!res.error) {
      const member = res.data
      const orgId = /* extract orgId logic unchanged */
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

### FE-006 — Extract PasswordInput component

Create `apps/web/src/features/auth/components/password-input.tsx`:

```ts
interface PasswordInputProps {
  id: string
  label: string
  autoComplete: string
  registration: UseFormRegisterReturn
  error?: FieldError
}
```

Encapsulates: Input + show/hide toggle Button + error message. Same visual pattern used in 4 places across login, register, and reset-password forms.

Reuse in:

- `login-form.tsx` (1 instance)
- `register-form.tsx` (2 instances — password + confirm)
- `reset-password-form.tsx` (2 instances)

`register-form.tsx` drops from 221 → ~160 lines.

---

## Testing Strategy

| PR   | Tests                                                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| PR 1 | Unit test for rate limiter with query params. Unit test for HMAC nonce rejection. Existing commission approval tests updated for new action. |
| PR 2 | Full role × action × subject matrix test in `abilities.spec.ts`. Chat JWT schema tests.                                                      |
| PR 3 | Manual QA via Playwright MCP: login flow, unauthenticated redirect, invitation flow.                                                         |

## Files Changed (Estimated)

| PR   | Files Modified | Files Created                                            | Files Deleted        |
| ---- | -------------- | -------------------------------------------------------- | -------------------- |
| PR 1 | ~12            | 0                                                        | 0                    |
| PR 2 | ~15            | 3 (`use-ability.ts`, `chat-jwt.ts`, `abilities.spec.ts`) | 1 (`permissions.ts`) |
| PR 3 | ~8             | 2 (`middleware.ts`, `password-input.tsx`)                | 0                    |
