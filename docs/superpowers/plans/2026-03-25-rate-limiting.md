# Rate Limiting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the platform against brute-force attacks, abuse, and resource exhaustion by adding targeted rate limits to auth endpoints, Socket.IO messaging, and invitation creation. All HTTP rate limit state lives in Redis for multi-instance consistency.
**Architecture:** Route-level `@fastify/rate-limit` overrides for auth + invitations; in-memory sliding window for Socket.IO messages; Redis-backed global limit.
**Tech Stack:** `@fastify/rate-limit` (already installed), Redis (IORedis, already in stack), Socket.IO middleware, Pino logger.
**Spec:** `docs/superpowers/specs/2026-03-25-rate-limiting-design.md`

---

## Task 1: Shared Rate Limit Constants + Redis Error Response Builder

### Goal

Create the centralized rate limit constants file and update the global rate limit registration to use Redis and the standard error envelope.

### Steps

- [ ] **1.1** Create `packages/shared/src/rate-limit-constants.ts`:

```typescript
export const RATE_LIMITS = {
  AUTH: {
    LOGIN: { max: 5, windowSeconds: 900 },
    FORGOT_PASSWORD: { max: 3, windowSeconds: 3600 },
    REGISTRATION: { max: 3, windowSeconds: 3600 },
  },
  INVITATION: { max: 20, windowSeconds: 3600 },
  MESSAGE: { max: 10, windowMs: 1_000 },
  GLOBAL: { max: 100, windowSeconds: 60 },
} as const
```

- [ ] **1.2** Export from `packages/shared/src/index.ts` — add this line:

```typescript
export { RATE_LIMITS } from './rate-limit-constants'
```

- [ ] **1.3** Update `apps/server/src/app.ts` — modify the global `rateLimit` registration to use the Redis store and add the `errorResponseBuilder` for the standard error envelope. Update the import and the registration block:

Replace:

```typescript
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})
```

With:

```typescript
await app.register(rateLimit, {
  max: RATE_LIMITS.GLOBAL.max,
  timeWindow: `${String(RATE_LIMITS.GLOBAL.windowSeconds)} seconds`,
  redis,
  nameSpace: 'rl:',
  errorResponseBuilder: (_request, context) => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Try again in ${String(Math.ceil(context.ttl / 1000))} seconds.`,
      retryAfter: Math.ceil(context.ttl / 1000),
    },
  }),
})
```

This requires creating a Redis client instance in `app.ts`. Look at how Redis is instantiated elsewhere in the project (e.g. `apps/server/src/bull-board.ts` uses `parseRedisUrl` + `IORedis`). Follow the same pattern — create a shared Redis client or instantiate one for rate limiting:

```typescript
import IORedis from 'ioredis'
import { RATE_LIMITS } from '@repo/shared'

// Near the top of buildApp(), before rate limit registration:
const redis = new IORedis(env.REDIS_URL)
```

Add `import IORedis from 'ioredis'` and `import { RATE_LIMITS } from '@repo/shared'` to the imports. Ensure `ioredis` is in `apps/server/package.json` dependencies (check first — it may already be a transitive dep; if not, run `pnpm add ioredis -F apps/server`).

- [ ] **1.4** Verify:

```bash
pnpm typecheck --filter=@repo/shared --filter=apps/server
```

- [ ] **1.5** Commit:

```
feat(shared): add centralized rate limit constants and Redis-backed global rate limit
```

---

## Task 2: Auth Endpoint Rate Limits (preHandler approach)

### Goal

Add per-path rate limiting to the Better Auth catch-all route (`/api/auth/*`) using a custom `preHandler` hook that inspects `request.url` and applies Redis-backed sliding window checks.

### Context

Better Auth uses a single catch-all route `app.route({ url: '/api/auth/*' })` in `apps/server/src/routes/auth-routes.ts`. Route-level `config.rateLimit` overrides won't work per-sub-path, so we use a `preHandler` that checks Redis manually.

### Steps

- [ ] **2.1** Create `apps/server/src/middlewares/auth-rate-limit.ts` with a `checkRateLimit` utility and the `authRateLimitHook`:

```typescript
import type { FastifyReply, FastifyRequest } from 'fastify'
import type IORedis from 'ioredis'
import { RATE_LIMITS } from '@repo/shared'

interface RateLimitConfig {
  readonly max: number
  readonly windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

async function checkRateLimit(
  redis: IORedis,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - config.windowSeconds
  const redisKey = `rl:${key}`

  // Sorted set sliding window: score = timestamp, member = unique entry
  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(redisKey, 0, windowStart)
  pipeline.zcard(redisKey)
  pipeline.zadd(redisKey, now, `${String(now)}:${String(Math.random())}`)
  pipeline.expire(redisKey, config.windowSeconds)

  const results = await pipeline.exec()
  // zcard result is at index 1
  const currentCount = (results?.[1]?.[1] as number) ?? 0

  if (currentCount >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + config.windowSeconds,
    }
  }

  return {
    allowed: true,
    remaining: config.max - currentCount - 1,
    resetAt: now + config.windowSeconds,
  }
}

interface AuthRateLimitPath {
  readonly pathSuffix: string
  readonly config: RateLimitConfig
  readonly keyExtractor: (request: FastifyRequest) => string
}

const AUTH_RATE_LIMIT_PATHS: readonly AuthRateLimitPath[] = [
  {
    pathSuffix: '/sign-in/email',
    config: RATE_LIMITS.AUTH.LOGIN,
    keyExtractor: (request) => {
      const body = request.body as Record<string, unknown> | undefined
      const email = typeof body?.email === 'string' ? body.email : request.ip
      return `login:${email}`
    },
  },
  {
    pathSuffix: '/forget-password',
    config: RATE_LIMITS.AUTH.FORGOT_PASSWORD,
    keyExtractor: (request) => {
      const body = request.body as Record<string, unknown> | undefined
      const email = typeof body?.email === 'string' ? body.email : request.ip
      return `forgot:${email}`
    },
  },
  {
    pathSuffix: '/sign-up/email',
    config: RATE_LIMITS.AUTH.REGISTRATION,
    keyExtractor: (request) => `register:${request.ip}`,
  },
]

export function createAuthRateLimitHook(redis: IORedis) {
  return async function authRateLimitHook(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const matchedPath = AUTH_RATE_LIMIT_PATHS.find((p) =>
      request.url.endsWith(p.pathSuffix)
    )
    if (!matchedPath) return

    if (request.method !== 'POST') return

    const key = matchedPath.keyExtractor(request)
    const result = await checkRateLimit(redis, key, matchedPath.config)

    if (!result.allowed) {
      const retryAfter = result.resetAt - Math.floor(Date.now() / 1000)
      request.log.warn({ key, retryAfter }, 'Auth rate limit exceeded')
      void reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Try again in ${String(retryAfter)} seconds.`,
          retryAfter,
        },
      })
    }
  }
}
```

**Note:** The `as number` on the pipeline result is acceptable here because IORedis pipeline `exec()` returns `Array<[Error | null, unknown]>` and there is no type-safe way to extract the zcard result. This is the one place where a targeted `as` assertion is justified — it's infrastructure code, not domain code. If this is still unacceptable per CLAUDE.md rules, an alternative is to use `Number()` coercion:

```typescript
const currentCount = Number(results?.[1]?.[1] ?? 0)
```

Use the `Number()` approach to stay fully compliant.

- [ ] **2.2** Update `apps/server/src/routes/auth-routes.ts` to accept the Redis client and add the `preHandler` hook:

Replace the current function signature and route registration:

```typescript
import type { FastifyInstance } from 'fastify'
import type { Auth } from '@repo/auth'
import type IORedis from 'ioredis'
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
    preHandler: [authRateLimitHook],
    async handler(request, reply) {
      // ... existing handler body unchanged ...
    },
  })
}
```

- [ ] **2.3** Update the `registerAuthRoutes` call in `apps/server/src/app.ts` to pass the Redis client:

```typescript
registerAuthRoutes(app, auth, redis)
```

- [ ] **2.4** Verify:

```bash
pnpm typecheck --filter=apps/server
```

- [ ] **2.5** Commit:

```
feat(server): add per-path auth rate limits (login, forgot-password, registration)
```

---

## Task 3: Socket.IO Message Rate Limiter

### Goal

Add an in-memory sliding window rate limiter for Socket.IO `send-message` events, per `userId`.

### Steps

- [ ] **3.1** Create `apps/chat-server/src/infra/socket/message-rate-limiter.ts`:

```typescript
import { RATE_LIMITS } from '@repo/shared'

interface WindowEntry {
  timestamps: number[]
}

const windows = new Map<string, WindowEntry>()

export function isMessageAllowed(userId: string): boolean {
  const now = Date.now()
  const entry = windows.get(userId) ?? { timestamps: [] }

  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < RATE_LIMITS.MESSAGE.windowMs
  )

  if (entry.timestamps.length >= RATE_LIMITS.MESSAGE.max) {
    return false
  }

  entry.timestamps.push(now)
  windows.set(userId, entry)
  return true
}

/** Periodic cleanup of stale entries (users who disconnected). Runs every 60s. */
const CLEANUP_INTERVAL_MS = 60_000
const STALE_THRESHOLD_MS = 60_000

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [userId, entry] of windows.entries()) {
    const lastTimestamp = entry.timestamps.at(-1) ?? 0
    if (now - lastTimestamp > STALE_THRESHOLD_MS) {
      windows.delete(userId)
    }
  }
}, CLEANUP_INTERVAL_MS)

// Allow Node.js process to exit cleanly
cleanupTimer.unref()
```

- [ ] **3.2** Update `apps/chat-server/src/infra/socket/socket-handler.ts` — in the `registerMessageEvents` function, add the rate limit check at the top of the `SEND_MESSAGE` handler.

Add the import at the top of the file:

```typescript
import { isMessageAllowed } from './message-rate-limiter.js'
```

In the `registerMessageEvents` function (around line 175), insert the rate limit check immediately inside the `async (data: unknown, ack?: unknown) => {` callback, before the existing `try {` block:

```typescript
    SOCKET_EVENTS.SEND_MESSAGE,
    async (data: unknown, ack?: unknown) => {
      if (!isMessageAllowed(user.userId)) {
        logger.warn({ userId: user.userId }, 'Message rate limit exceeded')
        if (typeof ack === 'function') {
          ack({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many messages. Try again shortly.',
            },
          })
        }
        return
      }
      try {
        // ... existing handler continues unchanged
```

- [ ] **3.3** Verify:

```bash
pnpm typecheck --filter=apps/chat-server
```

- [ ] **3.4** Commit:

```
feat(chat-server): add in-memory sliding window rate limiter for Socket.IO messages
```

---

## Task 4: Invitation Route Rate Limit

### Goal

Add a per-organization rate limit (20/hour) to the `POST /api/v1/invitations` route using `@fastify/rate-limit` route config.

### Steps

- [ ] **4.1** Update `apps/server/src/routes/v1/member-routes.ts` — add the rate limit config to the invitation POST route.

Add import at the top:

```typescript
import { RATE_LIMITS } from '@repo/shared'
```

Change the route options (around line 256) from:

```typescript
app.post(
  '/api/v1/invitations',
  { preHandler: [requireAbility('create', 'Invitation')] },
```

To:

```typescript
app.post(
  '/api/v1/invitations',
  {
    preHandler: [requireAbility('create', 'Invitation')],
    config: {
      rateLimit: {
        max: RATE_LIMITS.INVITATION.max,
        timeWindow: `${String(RATE_LIMITS.INVITATION.windowSeconds)} seconds`,
        keyGenerator: (request: FastifyRequest) =>
          `invite:${String(request.organizationId)}`,
      },
    },
  },
```

`FastifyRequest` is already imported in this file.

- [ ] **4.2** Verify:

```bash
pnpm typecheck --filter=apps/server
```

- [ ] **4.3** Commit:

```
feat(server): add per-org rate limit (20/hour) to invitation creation
```

---

## Task 5: Testing and Final Verification

### Goal

Run all quality gates, manually verify rate limit behavior, and ensure no regressions.

### Steps

- [ ] **5.1** Run the full typecheck across the monorepo:

```bash
pnpm typecheck
```

- [ ] **5.2** Run linting:

```bash
pnpm lint
```

- [ ] **5.3** Run the build:

```bash
pnpm build
```

- [ ] **5.4** Run existing tests to ensure no regressions:

```bash
pnpm test
```

- [ ] **5.5** Verify acceptance criteria against the spec — check each item:

1. Auth login: 6th attempt with same email within 15 min returns 429
2. Auth forgot-password: 4th request with same email within 1 hour returns 429
3. Auth registration: 4th registration from same IP within 1 hour returns 429
4. Socket.IO messages: 11th message in same second from same user rejected with `RATE_LIMIT_EXCEEDED`
5. Invitations: 21st invitation from same org within 1 hour returns 429
6. Global: existing 100 req/min per IP still works (now Redis-backed)
7. Error format: all 429 responses follow `{ success: false, error: { code, message } }`
8. Redis-backed: HTTP rate limits use Redis store
9. Constants: all limits centralized in `packages/shared/src/rate-limit-constants.ts`
10. No `console.log`: all logging uses Pino structured logger
11. No `any` type: all code fully typed

- [ ] **5.6** Final commit:

```
chore: verify rate limiting implementation passes all quality gates
```
