# Production Readiness — Fase 1: Desbloqueio

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all blockers for first real client — fix 3 CRITICAL security findings, LGPD deletion endpoint, and 10 quick-win security hardening items.

**Architecture:** Direct fixes to existing files (RBAC, cookies, JWT, logging), plus one new DDD use case for LGPD deletion following the existing `DeleteClient` pattern. No new packages or architectural changes.

**Tech Stack:** Fastify 5, tsyringe DI, Prisma 7, CASL 6, Better Auth 1.0, jsonwebtoken, Pino, Zod, React Hook Form, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-12-production-readiness-design.md`
**Audit:** `audit/auth-audit-2026-04-12.md`

---

## Task 1: AA-001 — Verify RLS DB Role

**Context:** The auth audit flagged that RLS may be entirely bypassed if the Prisma connection uses a superuser role. This task verifies the current state and adds a startup health check.

**Files:**

- Modify: `apps/server/src/server.ts`
- Modify: `apps/chat-server/src/index.ts`

- [ ] **Step 1: Check production DB role via SSH**

This step requires Artur to run on the production VPS:

```bash
docker compose exec postgres psql -U postgres -d bens_seguros -c \
  "SELECT current_user, usesuper FROM pg_user WHERE usename = current_user;"
```

And then check if the app user bypasses RLS:

```bash
docker compose exec postgres psql -U postgres -d bens_seguros -c \
  "SET app.current_tenant = 'nonexistent-org-id'; SELECT count(*) FROM \"Client\";"
```

**Expected outcomes:**

- If `usesuper = true` AND count > 0: RLS is bypassed. Need to create a dedicated `app_user` role (see Step 2a).
- If `usesuper = false` AND count = 0: RLS works. Skip to Step 3.
- If `usesuper = true` AND count = 0: Confusing state — investigate further.

Document the result before proceeding.

- [ ] **Step 2a: (ONLY if superuser) Create app_user role**

If Step 1 confirmed RLS is bypassed, this needs a dedicated app role. Run on production:

```sql
-- Create restricted app user
CREATE ROLE app_user WITH LOGIN PASSWORD '<generate-strong-password>';

-- Grant schema usage and table access (no DDL)
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Grant sequence usage (for auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Enable RLS enforcement for this role
-- (FORCE ROW LEVEL SECURITY already set on all 16 tables in rls-policies.sql)
```

Then update `DATABASE_URL` in production `.env` to use `app_user` instead of `postgres`.

- [ ] **Step 2b: (ONLY if superuser) Verify RLS is now active**

```bash
docker compose exec postgres psql -U app_user -d bens_seguros -c \
  "SET app.current_tenant = 'nonexistent-org-id'; SELECT count(*) FROM \"Client\";"
```

Expected: count = 0.

- [ ] **Step 3: Add RLS startup health check to server**

In `apps/server/src/server.ts`, add a verification after `buildApp()`:

```typescript
import { prisma } from '@repo/db'
```

Add after `const app = await buildApp()` (after line 20):

```typescript
// Verify RLS is active — critical for tenant isolation
const [rlsCheck] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT count(*) FROM "Client"
    WHERE "organizationId" = 'rls-health-check-nonexistent'
  `
if (rlsCheck.count !== 0n) {
  app.log.warn(
    'RLS health check: query for nonexistent org returned rows — RLS may be bypassed'
  )
}
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/server.ts
git commit -m "feat(server): add RLS startup health check (AA-001)"
```

---

## Task 2: AA-002 — Fix Audit Logs requireAbility

**Context:** `list-audit-logs.ts` uses `requireAbility('manage', 'all')` but ADMIN and MANAGER have `can('read', 'AuditLog')` in CASL. This blocks them incorrectly.

**Files:**

- Modify: `apps/server/src/routes/v1/audit-logs/list-audit-logs.ts:19`

- [ ] **Step 1: Fix the requireAbility call**

In `apps/server/src/routes/v1/audit-logs/list-audit-logs.ts`, change line 19:

```typescript
// Before
preHandler: [requireAbility('manage', 'all')],

// After
preHandler: [requireAbility('read', 'AuditLog')],
```

- [ ] **Step 2: Run typecheck and tests**

```bash
pnpm typecheck && pnpm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/audit-logs/list-audit-logs.ts
git commit -m "fix(rbac): audit-logs route uses read AuditLog instead of manage all (AA-002)"
```

---

## Task 3: AA-003 — COMMERCIAL Approve Commission

**Context:** The two-step commission approval flow requires COMMERCIAL to approve first. But COMMERCIAL lacks `approve` on `Commission` in CASL abilities.

**Files:**

- Modify: `packages/auth/src/abilities.ts:78-83`

- [ ] **Step 1: Add approve permission to COMMERCIAL role**

In `packages/auth/src/abilities.ts`, find the COMMERCIAL case (lines 78-83):

```typescript
// Before
case 'COMMERCIAL':
  can(['create', 'read', 'update'], ['Client', 'Proposal'])
  can('read', ['Policy', 'Commission', 'Claim'])
  can(['read', 'create'], 'Document')
  can('read', 'Notification')
  can('read', 'Member')
  break

// After
case 'COMMERCIAL':
  can(['create', 'read', 'update'], ['Client', 'Proposal'])
  can('read', ['Policy', 'Claim'])
  can(['read', 'approve'], 'Commission')
  can(['read', 'create'], 'Document')
  can('read', 'Notification')
  can('read', 'Member')
  break
```

- [ ] **Step 2: Run typecheck and tests**

```bash
pnpm typecheck && pnpm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/abilities.ts
git commit -m "fix(rbac): grant COMMERCIAL role approve on Commission (AA-003)"
```

---

## Task 4: AA-025 + AA-024 — Clear Chat Token and Org Cookie on Logout

**Context:** Logout clears React Query cache but leaves the chat JWT and org cookie behind. The chat token allows stale auth; the org cookie causes session fixation on shared devices.

**Files:**

- Modify: `apps/web/src/features/auth/hooks/use-auth.ts:113-121`

- [ ] **Step 1: Import clearChatToken and clearActiveOrgCookie**

Check if `clearChatToken` is already imported in `use-auth.ts`. If not, add at the top:

```typescript
import { clearChatToken } from '@/features/chat/lib/chat-api'
import { clearActiveOrgCookie } from '@/lib/org-cookie'
```

- [ ] **Step 2: Update logout onSuccess callback**

In `apps/web/src/features/auth/hooks/use-auth.ts`, replace lines 113-121:

```typescript
// Before
const logout = useMutation({
  mutationFn: () => authClient.signOut(),
  onSuccess: () => {
    // Keep bens-active-org cookie — it survives logout so next login
    // can restore the last org without showing /select-org
    queryClient.clear()
    router.push('/login')
  },
})

// After
const logout = useMutation({
  mutationFn: () => authClient.signOut(),
  onSuccess: () => {
    clearChatToken()
    clearActiveOrgCookie()
    queryClient.clear()
    router.push('/login')
  },
})
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/hooks/use-auth.ts
git commit -m "fix(auth): clear chat token and org cookie on logout (AA-024, AA-025)"
```

---

## Task 5: AA-023 — Org Cookie Secure Flag

**Context:** `setActiveOrgCookie` omits the `Secure` attribute, allowing the cookie to be transmitted over plain HTTP.

**Files:**

- Modify: `apps/web/src/lib/org-cookie.ts`

- [ ] **Step 1: Add secure flag based on protocol**

Replace the full `setActiveOrgCookie` function in `apps/web/src/lib/org-cookie.ts`:

```typescript
// Before (line 4-6)
export function setActiveOrgCookie(organizationId: string) {
  document.cookie = `${COOKIE_NAME}=${organizationId};path=/;max-age=${MAX_AGE};samesite=lax`
}

// After
export function setActiveOrgCookie(organizationId: string) {
  const secure = globalThis.location?.protocol === 'https:' ? ';secure' : ''
  document.cookie = `${COOKIE_NAME}=${organizationId};path=/;max-age=${MAX_AGE};samesite=lax${secure}`
}
```

Also update `clearActiveOrgCookie` to match attributes:

```typescript
// Before (line 8-10)
export function clearActiveOrgCookie() {
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0`
}

// After
export function clearActiveOrgCookie() {
  const secure = globalThis.location?.protocol === 'https:' ? ';secure' : ''
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;samesite=lax${secure}`
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/org-cookie.ts
git commit -m "fix(auth): add Secure flag to org cookie in HTTPS (AA-023)"
```

---

## Task 6: AA-028 — Pin JWT Algorithm to HS256

**Context:** All 4 `jwt.verify()` call sites omit the `algorithms` option. Pinning to HS256 prevents algorithm confusion attacks.

**Files:**

- Modify: `apps/chat-server/src/infra/socket/socket-auth.ts:32`
- Modify: `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts:30`
- Modify: `apps/chat-server/src/infra/http/middleware/widget-auth.ts:36`

- [ ] **Step 1: Pin algorithm in socket-auth.ts**

In `apps/chat-server/src/infra/socket/socket-auth.ts`, change line 32:

```typescript
// Before
const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET)

// After
const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET, {
  algorithms: ['HS256'],
})
```

- [ ] **Step 2: Pin algorithm in chat-auth-middleware.ts**

In `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts`, change line 30:

```typescript
// Before
const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET)

// After
const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET, {
  algorithms: ['HS256'],
})
```

- [ ] **Step 3: Pin algorithm in widget-auth.ts**

In `apps/chat-server/src/infra/http/middleware/widget-auth.ts`, change line 36:

```typescript
// Before
const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET)

// After
const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET, {
  algorithms: ['HS256'],
})
```

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm typecheck && pnpm --filter @app/chat-server test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/chat-server/src/infra/socket/socket-auth.ts apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts apps/chat-server/src/infra/http/middleware/widget-auth.ts
git commit -m "fix(security): pin JWT algorithm to HS256 in all verify calls (AA-028)"
```

---

## Task 7: AA-029 — Role z.enum() Validation

**Context:** JWT payload schemas validate `role` as `z.string()` instead of the 5 valid roles. Defense-in-depth: validate precisely.

**Files:**

- Modify: `apps/chat-server/src/infra/socket/socket-auth.ts:10`
- Modify: `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts:9`

- [ ] **Step 1: Fix socket-auth.ts schema**

In `apps/chat-server/src/infra/socket/socket-auth.ts`, change line 10:

```typescript
// Before
role: z.string(),

// After
role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
```

- [ ] **Step 2: Fix chat-auth-middleware.ts schema**

In `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts`, change line 9:

```typescript
// Before
role: z.string(),

// After
role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
```

- [ ] **Step 3: Run typecheck and tests**

```bash
pnpm typecheck && pnpm --filter @app/chat-server test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/chat-server/src/infra/socket/socket-auth.ts apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts
git commit -m "fix(security): validate JWT role as enum instead of string (AA-029)"
```

---

## Task 8: AA-008 — Email Verification Required in Production

**Context:** `requireEmailVerification` is `false` when `RESEND_API_KEY` is missing. In production, this should always be `true`.

**Files:**

- Modify: `packages/auth/src/index.ts:70`

- [ ] **Step 1: Make email verification always required in production**

In `packages/auth/src/index.ts`, change line 70:

```typescript
// Before
requireEmailVerification: !!emailSenders,

// After
requireEmailVerification: isProduction || !!emailSenders,
```

This ensures: in production, email verification is always on (even if RESEND_API_KEY is accidentally missing — Better Auth will throw on email send, which is better than silently allowing unverified signups). In development, it follows emailSenders availability.

- [ ] **Step 2: Run typecheck and tests**

```bash
pnpm typecheck && pnpm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/index.ts
git commit -m "fix(auth): require email verification in production regardless of RESEND_API_KEY (AA-008)"
```

---

## Task 9: AA-011 — Rate Limit Email Verification Resend

**Context:** `/send-verification-email` is only limited by global 100/min. Should have dedicated rate limiting (3/hour per email) to prevent email bombing.

**Files:**

- Modify: `packages/shared/src/rate-limit-constants.ts`
- Modify: `apps/server/src/middlewares/auth-rate-limit.ts`

- [ ] **Step 1: Add rate limit constant**

In `packages/shared/src/rate-limit-constants.ts`, add to the AUTH section:

```typescript
// Before
AUTH: {
  LOGIN: { max: 10, windowSeconds: 900 },
  FORGOT_PASSWORD: { max: 3, windowSeconds: 3600 },
  REGISTRATION: { max: 5, windowSeconds: 3600 },
},

// After
AUTH: {
  LOGIN: { max: 10, windowSeconds: 900 },
  FORGOT_PASSWORD: { max: 3, windowSeconds: 3600 },
  REGISTRATION: { max: 5, windowSeconds: 3600 },
  VERIFY_EMAIL: { max: 3, windowSeconds: 3600 },
},
```

- [ ] **Step 2: Add rate limit path entry**

In `apps/server/src/middlewares/auth-rate-limit.ts`, add after line 41 (after the sign-up entry):

```typescript
{
  suffix: '/send-verification-email',
  config: RATE_LIMITS.AUTH.VERIFY_EMAIL,
  keyExtractor: (request) => {
    const body = isRecord(request.body) ? request.body : undefined
    const email =
      typeof body?.['email'] === 'string' ? body['email'] : 'unknown'
    return `auth:verify:${email.toLowerCase()}`
  },
},
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/rate-limit-constants.ts apps/server/src/middlewares/auth-rate-limit.ts
git commit -m "fix(security): rate limit email verification resend 3/hour (AA-011)"
```

---

## Task 10: Worker Pino Redaction

**Context:** Both `chat-worker` and `worker` create Pino loggers without PII redaction config. Any PII logged (CPF, phone, email) appears in plaintext.

**Files:**

- Modify: `apps/chat-worker/src/index.ts:37-40`
- Modify: `apps/worker/src/index.ts:24-26`

- [ ] **Step 1: Add redaction to chat-worker logger**

In `apps/chat-worker/src/index.ts`, add import and update logger:

First, add import at top (after existing imports):

```typescript
import { PINO_REDACT_CONFIG } from '@repo/shared/pino-redact'
```

Then change the logger creation (lines 37-40):

```typescript
// Before
const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  name: 'chat-worker',
})

// After
const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  name: 'chat-worker',
  redact: PINO_REDACT_CONFIG,
})
```

- [ ] **Step 2: Add redaction to worker logger**

In `apps/worker/src/index.ts`, add import at top:

```typescript
import { PINO_REDACT_CONFIG } from '@repo/shared/pino-redact'
```

Then change the logger creation (lines 24-26):

```typescript
// Before
const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
})

// After
const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  name: 'worker',
  redact: PINO_REDACT_CONFIG,
})
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/chat-worker/src/index.ts apps/worker/src/index.ts
git commit -m "fix(security): add Pino PII redaction to chat-worker and worker loggers"
```

---

## Task 11: LGPD Data Deletion — Domain Layer

**Context:** LGPD Art. 18(IV) requires a data deletion/anonymization endpoint for clients. This follows the existing DDD pattern in `packages/core/src/modules/client/`. The use case anonymizes PII in Client + audit log snapshots, and keeps transactional records (fiscal retention 5 years).

**Scope note:** Full LGPD deletion per `docs/SECURITY-SPEC.md` Section 4 also includes deleting chat data (MongoDB) and R2 documents. Those cross-service operations require a BullMQ worker job and will be implemented in Fase 2. This task covers the critical PostgreSQL anonymization.

**Files:**

- Create: `packages/core/src/modules/client/application/lgpd-delete-client.ts`
- Create: `packages/core/src/modules/client/application/lgpd-delete-client.spec.ts`
- Modify: `packages/core/src/modules/client/domain/client-repository.ts`
- Modify: `packages/core/src/modules/client/infrastructure/prisma-client-repository.ts`
- Modify: `packages/core/src/modules/client/index.ts`

- [ ] **Step 1: Add `lgpdAnonymize` method to repository interface**

In `packages/core/src/modules/client/domain/client-repository.ts`, add to the `ClientRepository` interface (after `softDelete`):

```typescript
lgpdAnonymize(id: string, organizationId: string): Promise<void>
```

- [ ] **Step 2: Write the failing test**

Create `packages/core/src/modules/client/application/lgpd-delete-client.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LgpdDeleteClient } from './lgpd-delete-client.js'
import type { ClientRepository } from '../domain/client-repository.js'
import type { ClientData } from '../domain/client-repository.js'

function makeClient(overrides: Partial<ClientData> = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    name: 'João Silva',
    document: '***456.789-00',
    personType: 'INDIVIDUAL',
    type: 'CLIENT',
    email: 'joao@test.com',
    phone: '+5511999999999',
    birthDate: new Date('1990-01-01'),
    profession: 'Engenheiro',
    maritalStatus: 'MARRIED',
    address: null,
    socialMedia: null,
    tags: ['vip'],
    consentLgpd: true,
    salespersonId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('LgpdDeleteClient', () => {
  let useCase: LgpdDeleteClient
  let clientRepo: ClientRepository

  beforeEach(() => {
    clientRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByDocument: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      lgpdAnonymize: vi.fn(),
    }
    useCase = new LgpdDeleteClient(clientRepo)
  })

  it('anonymizes client when found', async () => {
    vi.mocked(clientRepo.findById).mockResolvedValue(makeClient())

    await useCase.execute('client-1', 'org-1')

    expect(clientRepo.findById).toHaveBeenCalledWith('client-1', 'org-1')
    expect(clientRepo.lgpdAnonymize).toHaveBeenCalledWith('client-1', 'org-1')
  })

  it('throws ClientNotFoundError when client does not exist', async () => {
    vi.mocked(clientRepo.findById).mockResolvedValue(null)

    await expect(useCase.execute('missing', 'org-1')).rejects.toThrow(
      'Cliente missing não encontrado'
    )
    expect(clientRepo.lgpdAnonymize).not.toHaveBeenCalled()
  })

  it('throws ClientNotFoundError when client is already anonymized', async () => {
    vi.mocked(clientRepo.findById).mockResolvedValue(
      makeClient({ name: 'Cliente removido', email: null, phone: null })
    )
    vi.mocked(clientRepo.findById).mockResolvedValue(null)

    await expect(useCase.execute('client-1', 'org-1')).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm --filter @repo/core exec vitest run src/modules/client/application/lgpd-delete-client.spec.ts
```

Expected: FAIL — `lgpd-delete-client.ts` does not exist yet.

- [ ] **Step 4: Implement the use case**

Create `packages/core/src/modules/client/application/lgpd-delete-client.ts`:

```typescript
import { injectable, inject } from 'tsyringe'
import type { ClientRepository } from '../domain/client-repository.js'
import { ClientErrors } from '../domain/client-errors.js'

@injectable()
export class LgpdDeleteClient {
  constructor(
    @inject('ClientRepository') private readonly clientRepo: ClientRepository
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const existing = await this.clientRepo.findById(id, organizationId)
    if (!existing) {
      throw ClientErrors.notFound(id)
    }
    await this.clientRepo.lgpdAnonymize(id, organizationId)
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm --filter @repo/core exec vitest run src/modules/client/application/lgpd-delete-client.spec.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Implement lgpdAnonymize in Prisma repository**

In `packages/core/src/modules/client/infrastructure/prisma-client-repository.ts`, add after the `softDelete` method:

```typescript
async lgpdAnonymize(id: string, organizationId: string): Promise<void> {
  await this.prisma.$transaction([
    this.prisma.client.update({
      where: { id, organizationId },
      data: {
        name: 'Cliente removido',
        document: '***.***.***-**',
        documentEncrypted: '',
        documentHash: '',
        email: null,
        phone: null,
        birthDate: null,
        profession: null,
        maritalStatus: null,
        address: null,
        socialMedia: null,
        tags: [],
        consentLgpd: false,
        deletedAt: new Date(),
      },
    }),
    // Anonymize audit log snapshots that may contain PII
    this.prisma.auditLog.updateMany({
      where: { entityType: 'Client', entityId: id, organizationId },
      data: { before: null, after: null },
    }),
  ])
}
```

- [ ] **Step 7: Export from module index**

In `packages/core/src/modules/client/index.ts`, add in the Application section:

```typescript
export { LgpdDeleteClient } from './application/lgpd-delete-client.js'
```

- [ ] **Step 8: Run full typecheck and tests**

```bash
pnpm typecheck && pnpm --filter @repo/core test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/modules/client/
git commit -m "feat(core): add LgpdDeleteClient use case for LGPD Art. 18 data anonymization"
```

---

## Task 12: LGPD Data Deletion — Route + Error Mapping

**Context:** Wire the `LgpdDeleteClient` use case to a POST route (not DELETE — the record persists in anonymized form). Add audit logging for the LGPD action.

**Files:**

- Create: `apps/server/src/routes/v1/clients/lgpd-delete-client.ts`
- Modify: `apps/server/src/routes/v1/clients/index.ts`

- [ ] **Step 1: Create the route handler**

Create `apps/server/src/routes/v1/clients/lgpd-delete-client.ts`:

```typescript
import { container, LgpdDeleteClient } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditDelete } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema } from './_schemas.js'

export function lgpdDeleteClientRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/clients/:id/lgpd-delete',
    schema: {
      tags: ['Clients'],
      summary: 'LGPD data anonymization — irreversible',
      operationId: 'lgpdDeleteClient',
      params: idParamSchema,
    },
    preHandler: [requireAbility('delete', 'Client')],
    handler: async (request, reply) => {
      const useCase = container.resolve(LgpdDeleteClient)
      try {
        await useCase.execute(request.params.id, request.organizationId!)
        auditDelete({
          request,
          entityType: 'Client',
          entityId: request.params.id,
        })
        return reply.status(200).send({
          success: true,
          data: { message: 'Dados do cliente anonimizados conforme LGPD' },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
```

- [ ] **Step 2: Register the route**

In `apps/server/src/routes/v1/clients/index.ts`, add import:

```typescript
import { lgpdDeleteClientRoute } from './lgpd-delete-client.js'
```

Add registration before `getClientRoute(app)` (static path before parametric):

```typescript
lgpdDeleteClientRoute(app)
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/clients/lgpd-delete-client.ts apps/server/src/routes/v1/clients/index.ts
git commit -m "feat(server): add POST /api/v1/clients/:id/lgpd-delete route for LGPD anonymization"
```

---

## Task 13: LGPD Data Deletion — Frontend Dialog

**Context:** A destructive confirmation dialog that requires typing the client name. Uses existing shadcn/ui AlertDialog pattern. Placed in the client detail page actions.

**Files:**

- Create: `apps/web/src/features/clients/components/lgpd-delete-dialog.tsx`
- Modify: client detail page to add trigger button (file depends on existing structure)

- [ ] **Step 1: Generate API client (after server running with new route)**

```bash
pnpm --filter @app/server dev &
# Wait for server to start
pnpm --filter @app/web generate:api
```

This generates the `lgpdDeleteClient` mutation hook.

- [ ] **Step 2: Create the LGPD delete dialog component**

Create `apps/web/src/features/clients/components/lgpd-delete-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLgpdDeleteClient } from '../hooks/use-lgpd-delete-client'

interface LgpdDeleteDialogProps {
  clientId: string
  clientName: string
}

export function LgpdDeleteDialog({
  clientId,
  clientName,
}: LgpdDeleteDialogProps) {
  const [confirmation, setConfirmation] = useState('')
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useLgpdDeleteClient()

  const isConfirmed = confirmation === clientName

  function handleConfirm() {
    mutate(clientId, {
      onSuccess: () => setOpen(false),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Exclusão LGPD
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exclusão LGPD — Ação Irreversível</AlertDialogTitle>
          <AlertDialogDescription>
            Todos os dados pessoais deste cliente serão anonimizados
            permanentemente. Registros fiscais (propostas, apólices, comissões)
            serão mantidos por 5 anos conforme legislação. Para confirmar,
            digite o nome do cliente abaixo:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="lgpd-confirm">
            Digite <span className="font-semibold">{clientName}</span> para
            confirmar
          </Label>
          <Input
            id="lgpd-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={clientName}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmation('')}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Excluindo...' : 'Excluir dados'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 3: Create the mutation hook**

Create `apps/web/src/features/clients/hooks/use-lgpd-delete-client.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export function useLgpdDeleteClient() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (clientId: string) =>
      api.post(`/api/v1/clients/${clientId}/lgpd-delete`),
    onSuccess: () => {
      toast.success('Dados do cliente anonimizados conforme LGPD')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      router.push('/clients')
    },
    onError: () => {
      toast.error('Erro ao excluir dados do cliente')
    },
  })
}
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/clients/components/lgpd-delete-dialog.tsx apps/web/src/features/clients/hooks/use-lgpd-delete-client.ts
git commit -m "feat(web): add LGPD deletion dialog with typed confirmation for clients"
```

---

## Task 14: Wire LGPD Dialog to Client Detail Page

**Context:** The LGPD delete button should appear on the client detail page, visible only to OWNER and ADMIN roles (users with `delete:Client` permission).

**Files:**

- Modify: The client detail page (exact path depends on current structure — check `apps/web/src/app/(dashboard)/clients/[id]/page.tsx` or `apps/web/src/features/clients/components/client-detail.tsx`)

- [ ] **Step 1: Find the client detail page**

```bash
find apps/web/src -name "*client-detail*" -o -name "*client*page*" | head -10
```

- [ ] **Step 2: Add the LGPD delete dialog**

In the client detail page/component, import and conditionally render:

```tsx
import { LgpdDeleteDialog } from '../components/lgpd-delete-dialog'
import { usePermissions } from '@/hooks/use-permissions'
```

Add the button in the page actions area, guarded by permission check:

```tsx
{
  hasPermission('clients:delete') && (
    <LgpdDeleteDialog clientId={client.id} clientName={client.name} />
  )
}
```

The exact placement depends on the page structure. Place it near other destructive actions (delete button) or in a dedicated "Danger Zone" section.

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Test manually in browser**

Start dev server and verify:

1. Navigate to a client detail page as OWNER — "Exclusão LGPD" button visible
2. Click it — dialog appears with typed confirmation
3. Type wrong name — button stays disabled
4. Type correct name — button enables
5. Log in as VIEWER — button not visible

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): wire LGPD delete dialog to client detail page with RBAC guard"
```

---

## Task 15: Privacy Policy Placeholders

**Context:** The privacy policy page has `[INSERIR EMAIL DO DPO]`, `[INSERIR RAZÃO SOCIAL]`, `[INSERIR CNPJ]` placeholders that must be filled with real data before accepting clients.

**Files:**

- Modify: Privacy policy page (check `apps/web/src/app/(auth)/privacy/page.tsx` or similar)

- [ ] **Step 1: Find the privacy policy file**

```bash
grep -rl "INSERIR EMAIL DO DPO" apps/web/src/
```

- [ ] **Step 2: Ask Artur for the real values**

This step requires input from the product owner:

- Razão social da empresa
- CNPJ
- Email do DPO (Data Protection Officer)
- Endereço comercial

**STOP HERE** — wait for Artur to provide these values before making changes.

- [ ] **Step 3: Replace placeholders**

Replace all `[INSERIR ...]` placeholders with the real values provided.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/
git commit -m "docs(web): fill privacy policy with real company data for LGPD compliance"
```

---

## Task 16: Final Quality Gates

**Context:** Run all 5 quality gates to confirm Fase 1 is complete.

- [ ] **Step 1: Lint**

```bash
pnpm lint
```

Expected: Zero errors.

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: Zero errors.

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: Successful build.

- [ ] **Step 4: Test**

```bash
pnpm test
```

Expected: All tests pass (including new LGPD test).

- [ ] **Step 5: Verify audit findings resolved**

Manual verification checklist:

- [ ] AA-001: RLS startup health check runs on server start
- [ ] AA-002: ADMIN can access audit logs endpoint
- [ ] AA-003: COMMERCIAL can approve commissions
- [ ] AA-008: Email verification required in production
- [ ] AA-011: Email verification resend rate-limited
- [ ] AA-023: Org cookie has Secure flag in HTTPS
- [ ] AA-024: Org cookie cleared on logout
- [ ] AA-025: Chat token cleared on logout
- [ ] AA-028: JWT algorithm pinned to HS256
- [ ] AA-029: JWT role validated as enum
- [ ] Worker loggers have PII redaction
- [ ] LGPD deletion endpoint functional

- [ ] **Step 6: Create summary commit if needed**

If any fixes were needed during quality gates, commit them:

```bash
git add -A
git commit -m "fix: quality gate fixes for production readiness fase 1"
```
