# Rate Limiting Design Spec

**Date:** 2026-03-25
**Status:** Draft

## Goal

Harden the Bens Seguros platform against brute-force attacks, abuse, and resource exhaustion by adding targeted rate limits to auth endpoints, Socket.IO messaging, and invitation creation. All rate limit state must live in Redis for multi-instance consistency.

## Architecture

### Current State

| Layer       | What exists                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Global HTTP | `@fastify/rate-limit` at 100 req/min in `apps/server/src/app.ts`                                |
| Auth        | No per-endpoint rate limits                                                                     |
| Socket.IO   | `CHAT_LIMITS.MAX_SOCKET_CONNECTIONS_PER_ORG = 100` (connection cap only, no message throttling) |
| Invitations | No rate limit on `POST /api/v1/invitations`                                                     |

### Target State

```
┌──────────────────────────────────────────────────────┐
│  @fastify/rate-limit (global: 100 req/min per IP)    │
│  ┌────────────────────────────────────────────────┐  │
│  │  Route-level overrides (auth + invitations)    │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Socket.IO middleware (sliding window per userId)     │
└──────────────────────────────────────────────────────┘
```

### Storage

All counters use Redis (already in the stack). Key prefix: `rl:` with TTL matching the window.

## Auth Rate Limits

Use `@fastify/rate-limit` route-level `config.rateLimit` overrides on the Better Auth Fastify handler. Better Auth exposes standard Fastify routes, so per-route config works.

| Endpoint                         | Limit | Window | Key                 | Redis Key Pattern   |
| -------------------------------- | ----- | ------ | ------------------- | ------------------- |
| `POST /api/auth/sign-in/email`   | 5     | 15 min | `email` (from body) | `rl:login:{email}`  |
| `POST /api/auth/forget-password` | 3     | 1 hour | `email` (from body) | `rl:forgot:{email}` |
| `POST /api/auth/sign-up/email`   | 3     | 1 hour | `request.ip`        | `rl:register:{ip}`  |

### Implementation approach

Register route-level rate limit overrides via `@fastify/rate-limit`'s `routeConfig` option on the auth routes. Extract the key from `request.body` using the `keyGenerator` callback.

```typescript
// In the auth route registration (apps/server/src/app.ts or dedicated auth-routes.ts)
app.route({
  method: 'POST',
  url: '/api/auth/sign-in/email',
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes',
      keyGenerator: (request: FastifyRequest) => {
        const body = request.body as Record<string, unknown>
        return `login:${String(body.email ?? request.ip)}`
      },
    },
  },
  handler: authHandler,
})
```

If Better Auth's Fastify adapter does not expose individual routes for override (it uses a catch-all), use a `preHandler` hook on the catch-all route that inspects `request.url` and applies per-path limiting via a custom Redis-backed check.

### Fallback: custom preHandler

```typescript
// packages/shared/src/rate-limit-constants.ts
export const AUTH_RATE_LIMITS = {
  LOGIN: { max: 5, windowSeconds: 900 },
  FORGOT_PASSWORD: { max: 3, windowSeconds: 3600 },
  REGISTRATION: { max: 3, windowSeconds: 3600 },
} as const
```

A `checkRateLimit` utility function checks and increments a Redis counter with TTL. Returns `{ allowed: boolean; remaining: number; resetAt: number }`.

## Socket.IO Rate Limits

### Design: sliding window counter (in-memory Map)

A lightweight in-memory sliding window counter per `userId`. No Redis needed here since each Socket.IO server instance handles its own connections (a user's socket is pinned to one server via sticky sessions).

| Parameter        | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Max messages     | 10                                                                   |
| Window           | 1 second                                                             |
| Key              | `userId`                                                             |
| Action on exceed | Emit `error` event with `RATE_LIMIT_EXCEEDED` code, drop the message |

### Implementation

```typescript
// apps/chat-server/src/infra/socket/message-rate-limiter.ts

interface WindowEntry {
  timestamps: number[]
}

const windows = new Map<string, WindowEntry>()

const MESSAGE_RATE_LIMIT = {
  MAX_PER_WINDOW: 10,
  WINDOW_MS: 1_000,
} as const

export function isMessageAllowed(userId: string): boolean {
  const now = Date.now()
  const entry = windows.get(userId) ?? { timestamps: [] }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < MESSAGE_RATE_LIMIT.WINDOW_MS
  )

  if (entry.timestamps.length >= MESSAGE_RATE_LIMIT.MAX_PER_WINDOW) {
    return false
  }

  entry.timestamps.push(now)
  windows.set(userId, entry)
  return true
}

// Periodic cleanup of stale entries (every 60s)
setInterval(() => {
  const now = Date.now()
  for (const [userId, entry] of windows.entries()) {
    if (now - (entry.timestamps.at(-1) ?? 0) > 60_000) {
      windows.delete(userId)
    }
  }
}, 60_000)
```

Apply as middleware on the `send-message` event in `socket-handler.ts`:

```typescript
socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data, ack) => {
  if (!isMessageAllowed(user.id)) {
    logger.warn({ userId: user.id }, 'Message rate limit exceeded')
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
  // ... existing handler
})
```

### Why not Redis for Socket.IO

- Sticky sessions mean a user's messages always hit the same server instance
- 1-second window with 10 msg/s is too hot for Redis round-trips
- In-memory Map is zero-latency and sufficient

## API Rate Limits

### Invitation creation

| Endpoint                   | Limit | Window | Key              | Redis Key Pattern   |
| -------------------------- | ----- | ------ | ---------------- | ------------------- |
| `POST /api/v1/invitations` | 20    | 1 hour | `organizationId` | `rl:invite:{orgId}` |

Implementation via `@fastify/rate-limit` route config on the existing route in `apps/server/src/routes/v1/member-routes.ts`:

```typescript
app.post(
  '/api/v1/invitations',
  {
    preHandler: [requireAbility('create', 'Invitation')],
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 hour',
        keyGenerator: (request: FastifyRequest) =>
          `invite:${String(request.organizationId)}`,
      },
    },
  },
  async (request, reply) => {
    /* ... */
  }
)
```

## Error Response Format

All rate limit responses return HTTP 429 with the standard error envelope:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 14 minutes.",
    "retryAfter": 840
  }
}
```

### Custom error handler for @fastify/rate-limit

Configure the `errorResponseBuilder` in the global rate limit registration:

```typescript
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  redis,
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

### Socket.IO error format

Same envelope but delivered via Socket.IO ack callback (not HTTP):

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many messages. Try again shortly."
  }
}
```

## Constants Location

Add all rate limit constants to `packages/shared/src/rate-limit-constants.ts` and export from `packages/shared/src/index.ts`:

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

## Acceptance Criteria

1. **Auth login**: 6th login attempt with the same email within 15 min returns 429
2. **Auth forgot-password**: 4th forgot-password request with the same email within 1 hour returns 429
3. **Auth registration**: 4th registration from the same IP within 1 hour returns 429
4. **Socket.IO messages**: 11th message in the same second from the same user is rejected with `RATE_LIMIT_EXCEEDED` ack
5. **Invitations**: 21st invitation from the same org within 1 hour returns 429
6. **Global**: existing 100 req/min per IP still works as fallback
7. **Error format**: all 429 responses follow `{ success: false, error: { code, message } }` envelope
8. **Redis-backed**: HTTP rate limits use Redis store (not in-memory) for multi-instance consistency
9. **Constants**: all limits are centralized in `packages/shared/src/rate-limit-constants.ts`
10. **No `console.log`**: all rate limit logging uses Pino structured logger
11. **No `any` type**: all rate limit code is fully typed
