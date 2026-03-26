# SEC-10: Internal API HMAC Security — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static token authentication on internal API with HMAC-SHA256 request signing, adding timestamp validation and dedicated rate limiting.

**Architecture:** Shared `signRequest()`/`verifyRequest()` functions in `@repo/shared`, used by chat-worker (sign) and server middleware (verify). HMAC covers method + path + body + timestamp to prevent replay attacks and body tampering. Rate limit `/internal/*` at 20 req/min.

**Tech Stack:** Node.js `crypto.createHmac` + `crypto.timingSafeEqual`, `@fastify/rate-limit`, Vitest.

---

## File Structure

| File                                                      | Action  | Responsibility                                          |
| --------------------------------------------------------- | ------- | ------------------------------------------------------- |
| `packages/shared/src/internal-auth.ts`                    | Create  | `signRequest()` + `verifyRequest()` functions           |
| `packages/shared/src/internal-auth.spec.ts`               | Create  | Unit tests for sign/verify                              |
| `packages/shared/src/index.ts`                            | Modify  | Export new functions                                    |
| `packages/env/src/index.ts`                               | Modify  | Replace `INTERNAL_API_TOKEN` with `INTERNAL_API_SECRET` |
| `apps/server/src/middlewares/internal-auth-middleware.ts` | Rewrite | HMAC verification + timestamp check                     |
| `apps/server/src/app.ts`                                  | Modify  | Add rate limit for internal routes                      |
| `apps/chat-worker/src/tools/captar-lead.ts`               | Modify  | Sign requests with HMAC                                 |
| `packages/shared/src/rate-limit-constants.ts`             | Modify  | Add `INTERNAL` rate limit constant                      |

---

### Task 1: Add HMAC sign/verify functions with TDD

**Files:**

- Create: `packages/shared/src/internal-auth.ts`
- Create: `packages/shared/src/internal-auth.spec.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/shared/src/internal-auth.spec.ts`:

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { signRequest, verifyRequest } from './internal-auth.js'

const SECRET = 'a'.repeat(64)
const METHOD = 'POST'
const PATH = '/api/internal/leads'
const BODY = '{"clientName":"Maria"}'

describe('signRequest', () => {
  it('returns a hex string', () => {
    const sig = signRequest(SECRET, METHOD, PATH, BODY, 1000000)
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different signatures for different bodies', () => {
    const sig1 = signRequest(SECRET, METHOD, PATH, '{"a":1}', 1000000)
    const sig2 = signRequest(SECRET, METHOD, PATH, '{"a":2}', 1000000)
    expect(sig1).not.toBe(sig2)
  })

  it('produces different signatures for different timestamps', () => {
    const sig1 = signRequest(SECRET, METHOD, PATH, BODY, 1000000)
    const sig2 = signRequest(SECRET, METHOD, PATH, BODY, 1000001)
    expect(sig1).not.toBe(sig2)
  })
})

describe('verifyRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1000000 * 1000))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('accepts a valid signature within time window', () => {
    const timestamp = 1000000
    const sig = signRequest(SECRET, METHOD, PATH, BODY, timestamp)
    expect(verifyRequest(SECRET, sig, METHOD, PATH, BODY, timestamp)).toBe(true)
  })

  it('rejects an invalid signature', () => {
    expect(
      verifyRequest(SECRET, 'bad'.repeat(21) + 'x', METHOD, PATH, BODY, 1000000)
    ).toBe(false)
  })

  it('rejects a request older than maxAge (default 300s)', () => {
    const oldTimestamp = 1000000 - 301
    const sig = signRequest(SECRET, METHOD, PATH, BODY, oldTimestamp)
    expect(verifyRequest(SECRET, sig, METHOD, PATH, BODY, oldTimestamp)).toBe(
      false
    )
  })

  it('accepts a request within maxAge window', () => {
    const recentTimestamp = 1000000 - 60
    const sig = signRequest(SECRET, METHOD, PATH, BODY, recentTimestamp)
    expect(
      verifyRequest(SECRET, sig, METHOD, PATH, BODY, recentTimestamp)
    ).toBe(true)
  })

  it('rejects a future timestamp beyond maxAge', () => {
    const futureTimestamp = 1000000 + 301
    const sig = signRequest(SECRET, METHOD, PATH, BODY, futureTimestamp)
    expect(
      verifyRequest(SECRET, sig, METHOD, PATH, BODY, futureTimestamp)
    ).toBe(false)
  })

  it('rejects when signature length does not match', () => {
    expect(verifyRequest(SECRET, 'short', METHOD, PATH, BODY, 1000000)).toBe(
      false
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/artur/projects && pnpm --filter @repo/shared test -- internal-auth
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement sign/verify**

Create `packages/shared/src/internal-auth.ts`:

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

const SIGNATURE_LENGTH = 64

export function signRequest(
  secret: string,
  method: string,
  path: string,
  body: string,
  timestamp: number
): string {
  const payload = `${String(timestamp)}.${method}.${path}.${body}`
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function verifyRequest(
  secret: string,
  signature: string,
  method: string,
  path: string,
  body: string,
  timestamp: number,
  maxAge: number = 300
): boolean {
  const now = Math.floor(Date.now() / 1000)

  if (Math.abs(now - timestamp) > maxAge) {
    return false
  }

  if (signature.length !== SIGNATURE_LENGTH) {
    return false
  }

  const expected = signRequest(secret, method, path, body, timestamp)

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
```

- [ ] **Step 4: Export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
export { signRequest, verifyRequest } from './internal-auth'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/artur/projects && pnpm --filter @repo/shared test -- internal-auth
```

Expected: All 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/internal-auth.ts packages/shared/src/internal-auth.spec.ts packages/shared/src/index.ts
git commit -m "feat(shared): add HMAC request signing for internal API"
```

---

### Task 2: Update env config — replace INTERNAL_API_TOKEN with INTERNAL_API_SECRET

**Files:**

- Modify: `packages/env/src/index.ts`

- [ ] **Step 1: Replace env var definition**

In `packages/env/src/index.ts`, find:

```typescript
    // Internal API for lead capture from AI bot
    INTERNAL_API_URL: z.string().url().optional(),
    INTERNAL_API_TOKEN: z.string().min(1).optional(),
```

Replace with:

```typescript
    // Internal API for lead capture from AI bot
    INTERNAL_API_URL: z.string().url().optional(),
    INTERNAL_API_SECRET: z
      .string()
      .min(32, 'INTERNAL_API_SECRET must be at least 32 characters')
      .optional(),
```

- [ ] **Step 2: Commit**

```bash
git add packages/env/src/index.ts
git commit -m "feat(env): replace INTERNAL_API_TOKEN with INTERNAL_API_SECRET (min 32 chars)"
```

---

### Task 3: Add INTERNAL rate limit constant

**Files:**

- Modify: `packages/shared/src/rate-limit-constants.ts`

- [ ] **Step 1: Add INTERNAL key to RATE_LIMITS**

Read the file, find the `RATE_LIMITS` object, and add an `INTERNAL` entry. The existing structure has `AUTH`, `INVITATION`, `MESSAGE`, `GLOBAL` keys.

Add after `INVITATION`:

```typescript
  INTERNAL: { max: 20, windowSeconds: 60 },
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/rate-limit-constants.ts
git commit -m "feat(shared): add INTERNAL rate limit constant (20 req/min)"
```

---

### Task 4: Rewrite internal auth middleware with HMAC verification

**Files:**

- Rewrite: `apps/server/src/middlewares/internal-auth-middleware.ts`

- [ ] **Step 1: Replace the entire file**

Replace `apps/server/src/middlewares/internal-auth-middleware.ts` with:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@repo/env'
import { verifyRequest } from '@repo/shared'
import pino from 'pino'

const logger = pino({ name: 'internal-auth' })

export async function internalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const signature = request.headers['x-signature'] as string | undefined
  const timestampHeader = request.headers['x-timestamp'] as string | undefined
  const tenantId = request.headers['x-tenant-id'] as string | undefined

  if (!env.INTERNAL_API_SECRET) {
    logger.error('INTERNAL_API_SECRET not configured')
    return reply.status(503).send({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Internal API not configured',
      },
    })
  }

  if (!signature || !timestampHeader) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing signature or timestamp',
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
      : JSON.stringify(request.body ?? '')

  const isValid = verifyRequest(
    env.INTERNAL_API_SECRET,
    signature,
    request.method,
    request.url.split('?')[0],
    rawBody,
    timestamp
  )

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

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    return reply.status(400).send({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'X-Tenant-Id header required' },
    })
  }

  request.organizationId = tenantId
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/middlewares/internal-auth-middleware.ts
git commit -m "feat(server): rewrite internal auth middleware with HMAC verification"
```

---

### Task 5: Add rate limit for internal routes

**Files:**

- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Add rate limit to internal route registration**

In `apps/server/src/app.ts`, find:

```typescript
// Internal API routes (token-authenticated, no session required)
await app.register(internalLeadRoutes)
```

Replace with:

```typescript
// Internal API routes (HMAC-authenticated, no session required)
await app.register(async (internalApp) => {
  await internalApp.register(rateLimit, {
    max: RATE_LIMITS.INTERNAL.max,
    timeWindow: `${String(RATE_LIMITS.INTERNAL.windowSeconds)} seconds`,
    redis,
    nameSpace: 'rl:internal:',
    keyGenerator: (request: FastifyRequest) => request.ip,
    errorResponseBuilder: (
      _request: FastifyRequest,
      context: { ttl: number }
    ) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Try again in ${String(Math.ceil(context.ttl / 1000))} seconds.`,
        retryAfter: Math.ceil(context.ttl / 1000),
      },
    }),
  })
  await internalApp.register(internalLeadRoutes)
})
```

Also ensure `RATE_LIMITS` is imported from `@repo/shared` (it should already be — verify).

Also add the `FastifyRequest` import if not already present in the rateLimit type annotations. Check the existing `rateLimit` registration (global one) to match the pattern — it already uses an inline `errorResponseBuilder`, so follow the same pattern.

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/app.ts
git commit -m "feat(server): add 20 req/min rate limit for internal API routes"
```

---

### Task 6: Update chat-worker to sign requests with HMAC

**Files:**

- Modify: `apps/chat-worker/src/tools/captar-lead.ts`

- [ ] **Step 1: Replace token auth with HMAC signing**

In `apps/chat-worker/src/tools/captar-lead.ts`, update the imports:

```typescript
import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'
```

In the `execute` function, replace the env check:

```typescript
if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) {
  logger.warn(
    { tenantId },
    'Internal API not configured, skipping lead capture'
  )
  return {
    success: false,
    message:
      'Captacao de lead indisponivel no momento. Um atendente vai ajudar.',
  }
}
```

Replace the fetch call headers section:

```typescript
      try {
        const body = JSON.stringify({
          clientName: nomeCliente,
          clientPhone: contactPhone,
          insuranceType: tipoSeguro,
          notes: detalhes ?? '',
          source: 'WHATSAPP_BOT',
        })

        const path = '/api/internal/leads'
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = signRequest(
          env.INTERNAL_API_SECRET,
          'POST',
          path,
          body,
          timestamp
        )

        const response = await fetch(
          `${env.INTERNAL_API_URL}${path}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Signature': signature,
              'X-Timestamp': String(timestamp),
              'X-Tenant-Id': tenantId,
            },
            body,
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          }
        )
```

The rest of the error handling remains unchanged.

- [ ] **Step 2: Commit**

```bash
git add apps/chat-worker/src/tools/captar-lead.ts
git commit -m "feat(chat-worker): sign internal API requests with HMAC"
```

---

### Task 7: Verify full build, lint, tests

- [ ] **Step 1: Run all shared tests**

```bash
cd /home/artur/projects && pnpm --filter @repo/shared test
```

Expected: All tests pass (including new internal-auth tests).

- [ ] **Step 2: Run typecheck**

```bash
cd /home/artur/projects && pnpm typecheck
```

Expected: Zero errors.

- [ ] **Step 3: Run lint**

```bash
cd /home/artur/projects && pnpm lint
```

Expected: Zero errors.

- [ ] **Step 4: Run full build**

```bash
cd /home/artur/projects && pnpm build
```

Expected: Successful build.

- [ ] **Step 5: Final commit if fixes needed**

```bash
git add -u
git commit -m "fix: lint/build fixes for internal API HMAC security"
```

---

## Acceptance Criteria Checklist

- [ ] HMAC request signing implemented (`signRequest` + `verifyRequest`)
- [ ] Requests without valid signature return 403
- [ ] Requests with timestamp > 5 min return 403
- [ ] Rate limit of 20 req/min on `/internal/*`
- [ ] Chat-worker signs requests before sending
- [ ] `INTERNAL_API_SECRET` env var (min 32 chars) replaces `INTERNAL_API_TOKEN`
- [ ] `timingSafeEqual` used (prevents timing attacks)
- [ ] Unit tests for sign/verify functions
