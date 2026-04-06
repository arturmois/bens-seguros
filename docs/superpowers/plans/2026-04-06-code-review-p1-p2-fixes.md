# Code Review P1 + P2 Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 confirmed issues from the pre-launch code review report (4 P1 critical + 3 P2 important).

**Architecture:** Surgical, isolated fixes — each task touches 1-2 files max, no shared abstractions, no refactoring. All fixes are independent and can be committed separately.

**Tech Stack:** Fastify 5, Sentry Node SDK, Prisma, IORedis, Mongoose, Bash

**Spec:** `docs/superpowers/specs/2026-04-06-code-review-p1-p2-fixes-design.md`

---

### Task 1: Add Sentry to ERP Worker (P1-1a)

**Files:**

- Modify: `apps/worker/src/index.ts`

- [ ] **Step 1: Add Sentry imports at top of file**

Add these 3 imports at the very top of `apps/worker/src/index.ts`, BEFORE all other imports (Sentry must initialize before anything else):

```typescript
import * as Sentry from '@sentry/node'
import { env } from '@repo/env'
import { stripPiiFromEvent } from '@repo/shared/sentry-pii'

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      return stripPiiFromEvent(event)
    },
  })
}
```

The existing `import { env } from '@repo/env'` on line 9 should be removed (it moves up into the Sentry block). The existing `import pino from 'pino'` and all other imports come AFTER the Sentry block.

- [ ] **Step 2: Add Sentry.captureException to graceful shutdown error path**

The `gracefulShutdown` function (currently lines 52-71) calls `process.exit(0)`. No error catch needed there. But the file has no top-level error handler. Wrap the worker startup in a try-catch pattern by adding after line 74 (`process.on('SIGINT', gracefulShutdown)`):

```typescript
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception in worker')
  if (env.SENTRY_DSN) {
    Sentry.captureException(err)
    void Sentry.close(2000).then(() => process.exit(1))
  } else {
    process.exit(1)
  }
})
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @app/worker build`
Expected: Successful build, no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/worker/src/index.ts
git commit -m "fix: add Sentry to ERP worker for error visibility (P1-1)"
```

---

### Task 2: Add Sentry to Chat Worker (P1-1b)

**Files:**

- Modify: `apps/chat-worker/src/index.ts`

- [ ] **Step 1: Add Sentry imports at top of file**

Add these imports at the very top of `apps/chat-worker/src/index.ts`, BEFORE all other imports:

```typescript
import * as Sentry from '@sentry/node'
import { env } from '@repo/env'
import { stripPiiFromEvent } from '@repo/shared/sentry-pii'

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      return stripPiiFromEvent(event)
    },
  })
}
```

The existing `import { env } from '@repo/env'` on line 2 should be removed (moves up). All other imports come AFTER.

- [ ] **Step 2: Add Sentry.captureException to the bootstrap catch block**

The `bootstrap().catch()` at line 446-449 currently just logs and exits. Update it to also capture to Sentry:

```typescript
bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Chat worker bootstrap failed')
  if (env.SENTRY_DSN) {
    Sentry.captureException(err)
    void Sentry.close(2000).then(() => process.exit(1))
  } else {
    process.exit(1)
  }
})
```

- [ ] **Step 3: Add Sentry flush to graceful shutdown**

In the `gracefulShutdown` function (line 412-440), add Sentry flush before `process.exit(0)`:

```typescript
if (env.SENTRY_DSN) {
  await Sentry.close(2000)
}

process.exit(0)
```

- [ ] **Step 4: Verify build**

Run: `pnpm --filter @app/chat-worker build`
Expected: Successful build, no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/chat-worker/src/index.ts
git commit -m "fix: add Sentry to chat worker for error visibility (P1-1)"
```

---

### Task 3: Add Graceful Shutdown to Server (P1-2)

**Files:**

- Modify: `apps/server/src/server.ts`

- [ ] **Step 1: Rewrite the start function with shutdown handlers**

Replace the entire `start` function and its `.catch()` in `apps/server/src/server.ts` (lines 17-33):

```typescript
const start = async () => {
  const app = await buildApp()

  const port = env.PORT ?? 3001
  const host = env.HOST

  await app.listen({ port, host })
  app.log.info(`Server running on http://${host}:${port}`)

  const shutdown = async () => {
    app.log.info('Shutting down server...')
    await app.close()
    if (env.SENTRY_DSN) {
      await Sentry.close(2000)
    }
    app.log.info('Server shut down')
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown())
  process.on('SIGINT', () => void shutdown())
}

start().catch((err) => {
  if (env.SENTRY_DSN) {
    Sentry.captureException(err)
    void Sentry.close(2000).then(() => {
      process.exitCode = 1
      throw err
    })
  } else {
    process.exitCode = 1
    throw err
  }
})
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @app/server build`
Expected: Successful build, no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/server.ts
git commit -m "fix: add graceful shutdown to server (P1-2)"
```

---

### Task 4: Fix Migration Order in Deploy Script (P1-4)

**Files:**

- Modify: `scripts/deploy.sh`

- [ ] **Step 1: Move migration block before container deploy**

In `scripts/deploy.sh`, the migration block is at lines 94-101 (after health check). Move it to BEFORE the container deploy (after `docker compose pull`, before `docker compose up`).

The section from line 46 to line 52 currently reads:

```bash
echo "Pulling images with tag ${TAG}..."
export TAG
docker compose -f "$COMPOSE_FILE" pull $CONTAINERS

# --- Deploy containers (force recreate to use newly pulled image) ---
echo "Deploying ${CONTAINERS}..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate $CONTAINERS
```

Insert the migration block between pull and deploy:

```bash
echo "Pulling images with tag ${TAG}..."
export TAG
docker compose -f "$COMPOSE_FILE" pull $CONTAINERS

# --- Run Prisma migrations BEFORE deploying new containers (server only) ---
if [ "$SERVICE" = "server" ]; then
  echo "Running Prisma migrations on current container..."
  docker compose -f "$COMPOSE_FILE" exec -T server npx prisma migrate deploy || {
    echo "ERROR: Prisma migration failed! Aborting deploy."
    exit 1
  }
fi

# --- Deploy containers (force recreate to use newly pulled image) ---
echo "Deploying ${CONTAINERS}..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate $CONTAINERS
```

- [ ] **Step 2: Remove the old migration block**

Delete the old migration block that was at lines 94-101 (now after the health check section):

```bash
# --- Run Prisma migrations (server only, after new container is healthy) ---
if [ "$SERVICE" = "server" ]; then
  echo "Running Prisma migrations..."
  docker compose -f "$COMPOSE_FILE" exec -T server npx prisma migrate deploy || {
    echo "ERROR: Prisma migration failed!"
    exit 1
  }
fi
```

Remove this entire block.

- [ ] **Step 3: Verify script syntax**

Run: `bash -n scripts/deploy.sh`
Expected: No output (syntax OK).

- [ ] **Step 4: Commit**

```bash
git add scripts/deploy.sh
git commit -m "fix: run migrations before container deploy (P1-4)"
```

---

### Task 5: Add HSTS to Helmet (P1-5)

**Files:**

- Modify: `apps/server/src/app.ts`
- Modify: `apps/chat-server/src/app.ts`

- [ ] **Step 1: Add HSTS to server Helmet config**

In `apps/server/src/app.ts`, the Helmet registration is at lines 75-87. Add `hsts` to the config object:

Replace:

```typescript
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'cdn.jsdelivr.net', 'fonts.scalar.com'],
      connectSrc: ["'self'", 'proxy.scalar.com'],
      workerSrc: ["'self'", 'blob:'],
    },
  },
})
```

With:

```typescript
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'cdn.jsdelivr.net', 'fonts.scalar.com'],
      connectSrc: ["'self'", 'proxy.scalar.com'],
      workerSrc: ["'self'", 'blob:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
})
```

- [ ] **Step 2: Add HSTS to chat-server Helmet config**

In `apps/chat-server/src/app.ts`, line 108 has `await app.register(helmet)` with no config. Replace with:

```typescript
await app.register(helmet, {
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
})
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @app/server build && pnpm --filter @app/chat-server build`
Expected: Successful build for both.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/app.ts apps/chat-server/src/app.ts
git commit -m "fix: add HSTS to Helmet config in server and chat-server (P1-5)"
```

---

### Task 6: Robust Health Endpoints (P2-5)

**Files:**

- Modify: `apps/server/src/app.ts`
- Modify: `apps/chat-server/src/app.ts`

- [ ] **Step 1: Update server health endpoint**

In `apps/server/src/app.ts`, line 148 has:

```typescript
app.get('/health', async () => ({ status: 'ok' }))
```

The `redis` variable is already available in scope (created at line 55 as `const redis = new IORedis(env.REDIS_URL)`). For Prisma, import from `@repo/db`. Add the import at the top of the file:

```typescript
import { prisma } from '@repo/db'
```

Then replace the health endpoint:

```typescript
app.get('/health', async (_request, reply) => {
  const errors: string[] = []

  try {
    await prisma.$queryRawUnsafe('SELECT 1')
  } catch {
    errors.push('PostgreSQL unreachable')
  }

  try {
    await redis.ping()
  } catch {
    errors.push('Redis unreachable')
  }

  if (errors.length > 0) {
    return reply.status(503).send({ status: 'degraded', errors })
  }

  return { status: 'ok' }
})
```

- [ ] **Step 2: Update chat-server health endpoint**

In `apps/chat-server/src/app.ts`, line 159 has:

```typescript
app.get('/health', async () => ({ status: 'ok' }))
```

The `buildChatApp` function receives `options` with `redisPub` (an IORedis instance). For MongoDB, import `mongoose` from the `mongoose` package (already a dependency via `@repo/db-chat`). Add the import at the top of the file:

```typescript
import mongoose from 'mongoose'
```

Then replace the health endpoint. Note: `options.redisPub` is in scope inside `buildChatApp`:

```typescript
app.get('/health', async (_request, reply) => {
  const errors: string[] = []

  if (mongoose.connection.readyState !== 1) {
    errors.push('MongoDB unreachable')
  }

  try {
    await options.redisPub.ping()
  } catch {
    errors.push('Redis unreachable')
  }

  if (errors.length > 0) {
    return reply.status(503).send({ status: 'degraded', errors })
  }

  return { status: 'ok' }
})
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @app/server build && pnpm --filter @app/chat-server build`
Expected: Successful build for both.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/app.ts apps/chat-server/src/app.ts
git commit -m "fix: health endpoints verify DB and Redis connectivity (P2-5)"
```

---

### Task 7: Move JS Filter to Prisma WHERE (P2-8)

**Files:**

- Modify: `apps/server/src/routes/v1/claims/create-claim.ts`

- [ ] **Step 1: Add userId filter to Prisma query and remove JS filter**

In `apps/server/src/routes/v1/claims/create-claim.ts`, replace lines 34-43:

```typescript
const managers = await prisma.member.findMany({
  where: {
    organizationId: request.organizationId!,
    role: { in: ['ADMIN', 'MANAGER', 'OWNER'] },
  },
  include: { user: true },
})
const frontendUrl = env.FRONTEND_URL
const notifItems = managers.filter((m) => m.userId !== request.user!.id)
```

With:

```typescript
const managers = await prisma.member.findMany({
  where: {
    organizationId: request.organizationId!,
    role: { in: ['ADMIN', 'MANAGER', 'OWNER'] },
    userId: { not: request.user!.id },
  },
  include: { user: true },
})
const frontendUrl = env.FRONTEND_URL
const notifItems = managers
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @app/server build`
Expected: Successful build, no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/claims/create-claim.ts
git commit -m "fix: move manager filter from JS to Prisma WHERE clause (P2-8)"
```

---

### Task 8: Fix pt-BR Accent Violations (P2-9)

**Files:**

- Modify: `apps/server/src/routes/v1/organization/_schemas.ts`
- Modify: `apps/server/src/routes/v1/organization/upload-logo.ts`
- Modify: `apps/chat-worker/src/tools/update-client-data.ts`

- [ ] **Step 1: Fix accents in \_schemas.ts**

In `apps/server/src/routes/v1/organization/_schemas.ts`:

Line 9: `'Nome deve ter no maximo 100 caracteres'` → `'Nome deve ter no máximo 100 caracteres'`

Line 13: `'Slug deve ter no maximo 50 caracteres'` → `'Slug deve ter no máximo 50 caracteres'`

Line 16: `'Slug deve conter apenas letras minusculas, numeros e hifens'` → `'Slug deve conter apenas letras minúsculas, números e hífens'`

- [ ] **Step 2: Fix accents in upload-logo.ts**

In `apps/server/src/routes/v1/organization/upload-logo.ts`:

Line 66: `'Tipo de arquivo invalido. Permitidos: JPEG, PNG, WebP, GIF'` → `'Tipo de arquivo inválido. Permitidos: JPEG, PNG, WebP, GIF'`

Line 78: `'Arquivo excede o tamanho maximo de 2MB'` → `'Arquivo excede o tamanho máximo de 2MB'`

- [ ] **Step 3: Fix accents in update-client-data.ts**

In `apps/chat-worker/src/tools/update-client-data.ts`:

Line 14: `'Atualiza dados cadastrais do cliente (CPF, email, endereco, nascimento). Use apos identificar o cliente para completar ou corrigir informacoes.'` → `'Atualiza dados cadastrais do cliente (CPF, email, endereço, nascimento). Use após identificar o cliente para completar ou corrigir informações.'`

- [ ] **Step 4: Verify build**

Run: `pnpm --filter @app/server build && pnpm --filter @app/chat-worker build`
Expected: Successful build for both.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/organization/_schemas.ts apps/server/src/routes/v1/organization/upload-logo.ts apps/chat-worker/src/tools/update-client-data.ts
git commit -m "fix: correct pt-BR diacritics in UI and tool strings (P2-9)"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run full quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

Expected: All 4 gates pass with zero errors.

- [ ] **Step 2: Verify all changes are committed**

```bash
git status
git log --oneline -8
```

Expected: Clean working tree, 7 new commits (one per task 1-8, excluding task 9).
