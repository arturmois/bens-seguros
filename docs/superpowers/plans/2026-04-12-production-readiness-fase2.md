# Production Readiness — Fase 2: Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the production system with observability, unified RBAC, performance tuning, backup encryption, and fix worker RLS breakage from Fase 1.

**Architecture:** Incremental improvements to existing files. No new packages. Request IDs via Fastify `onRequest` hook, Sentry `serverName` per app, CASL replaces hand-maintained PERMISSION_MATRIX, workers get dedicated superuser DB connection.

**Tech Stack:** Fastify 5, Pino, Sentry 10, BullMQ 5, CASL 6, TanStack React Query 5, Prisma 7, OpenSSL

**Spec:** `docs/superpowers/specs/2026-04-12-production-readiness-design.md` (Fase 2)
**Depends on:** Fase 1 complete (PR #96)

---

## Task 1: Fix Worker DATABASE_URL — RLS Breakage (P0)

**Context:** Fase 1 changed production `DATABASE_URL` to `app_user` (non-superuser) for RLS enforcement. But workers use global `prisma` without `set_config('app.current_tenant', ...)`. With FORCE RLS active, worker queries on strict-RLS tables (Client, Proposal, Policy, Commission, Claim, etc.) silently return 0 rows. Alert processors, CSV import, quote emails, and policy expiry are all broken in production.

**Fix:** Add `WORKER_DATABASE_URL` env var pointing to the superuser `bens_prod`. Workers already have explicit `organizationId` filters — RLS is defense-in-depth, not primary gate for workers.

**Files:**

- Modify: `packages/env/src/index.ts`
- Modify: `packages/db/src/index.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/chat-worker/src/index.ts`
- Modify: `.env.example`
- Modify: `.env.example.prod`

- [ ] **Step 1: Add WORKER_DATABASE_URL to env schema**

In `packages/env/src/index.ts`, add after the `DATABASE_URL` line (line 13):

```typescript
WORKER_DATABASE_URL: z.string().url().optional(),
```

- [ ] **Step 2: Export a worker-specific prisma client from packages/db**

In `packages/db/src/index.ts`, add a factory function after the existing `prisma` export:

```typescript
import { PrismaClient } from '../generated/client/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@repo/env'

// ... existing prisma singleton ...

/**
 * Creates a Prisma client for worker processes.
 * Uses WORKER_DATABASE_URL (superuser) if available, falls back to DATABASE_URL.
 * Workers use explicit organizationId filters — RLS is defense-in-depth, not primary gate.
 */
export function createWorkerPrismaClient(): PrismaClient {
  const connectionString = env.WORKER_DATABASE_URL ?? env.DATABASE_URL
  const adapter = new PrismaPg({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  })
  return new PrismaClient({ adapter })
}
```

- [ ] **Step 3: Update worker to use worker prisma client**

In `apps/worker/src/index.ts`, add import and create the worker client. Currently processors import `prisma` from `@repo/db` directly. The simplest fix: register the worker client as a module-level singleton and pass it to processors.

Add after the logger creation (after line 30):

```typescript
import { createWorkerPrismaClient } from '@repo/db'

const workerPrisma = createWorkerPrismaClient()
```

Then update each processor setup to receive the prisma client. Check each `setup*Processor` function signature — if they import `prisma` directly from `@repo/db`, update them to accept it as a parameter. If they use DI, register the worker client.

**Note:** This step requires checking each processor's prisma import pattern. The subagent implementing this should `grep -rn "from '@repo/db'" apps/worker/src/` to find all import sites and update them.

- [ ] **Step 4: Update chat-worker similarly**

In `apps/chat-worker/src/index.ts`, same pattern — create worker prisma client and pass to processors.

- [ ] **Step 5: Add WORKER_DATABASE_URL to .env.example files**

In `.env.example`, add after DATABASE_URL:

```bash
# Worker database URL (superuser, bypasses RLS — workers have explicit org filters)
# WORKER_DATABASE_URL=postgresql://bens_prod:password@localhost:5432/bens_seguros
```

In `.env.example.prod`, add:

```bash
WORKER_DATABASE_URL=postgresql://bens_prod:${DB_PASSWORD}@postgres:5432/bens_seguros
```

- [ ] **Step 6: Update production .env via SSH**

```bash
ssh bens-vps "echo 'WORKER_DATABASE_URL=postgresql://bens_prod:OLD_PASSWORD@postgres:5432/bens_seguros' >> /opt/bens-seguros/.env"
```

Replace `OLD_PASSWORD` with the original `bens_prod` password from the DATABASE_URL backup.

- [ ] **Step 7: Run typecheck and tests**

```bash
pnpm typecheck && pnpm test
```

- [ ] **Step 8: Commit**

```bash
git add packages/env/ packages/db/ apps/worker/ apps/chat-worker/ .env.example .env.example.prod
git commit -m "fix(db): add WORKER_DATABASE_URL for worker processes to bypass RLS (P0)"
```

---

## Task 2: Request ID Propagation

**Context:** No correlation IDs exist between services. When debugging production issues, there's no way to trace a request across server → chat-server → workers. Fastify supports request IDs natively via `genReqId`.

**Files:**

- Modify: `apps/server/src/app.ts`
- Modify: `apps/chat-server/src/app.ts`

- [ ] **Step 1: Add request ID generation to server**

In `apps/server/src/app.ts`, Fastify is created at line ~58. Add `genReqId` and `requestIdHeader`:

```typescript
const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: PINO_REDACT_CONFIG,
  },
  bodyLimit: 10 * 1024 * 1024,
  trustProxy: true,
  genReqId: (req) =>
    (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
  requestIdHeader: 'x-request-id',
})
```

Add import at top of file:

```typescript
import crypto from 'node:crypto'
```

- [ ] **Step 2: Propagate request ID in response headers**

Add after the Fastify creation in `apps/server/src/app.ts`:

```typescript
app.addHook('onSend', async (request, reply) => {
  reply.header('x-request-id', request.id)
})
```

- [ ] **Step 3: Same for chat-server**

In `apps/chat-server/src/app.ts`, same changes to the Fastify creation (around line 58):

```typescript
import crypto from 'node:crypto'
```

```typescript
const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: PINO_REDACT_CONFIG,
  },
  trustProxy: true,
  genReqId: (req) =>
    (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
  requestIdHeader: 'x-request-id',
})
```

And add the response header hook:

```typescript
app.addHook('onSend', async (request, reply) => {
  reply.header('x-request-id', request.id)
})
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/app.ts apps/chat-server/src/app.ts
git commit -m "feat(server): add request ID generation and propagation via x-request-id"
```

---

## Task 3: Sentry Service Names

**Context:** All 4 apps use identical Sentry config. When errors appear in Sentry, there's no way to tell which service (server, chat-server, worker, chat-worker) generated them.

**Files:**

- Modify: `apps/server/src/server.ts`
- Modify: `apps/chat-server/src/index.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/chat-worker/src/index.ts`

- [ ] **Step 1: Add serverName to server Sentry.init**

In `apps/server/src/server.ts`, line 8:

```typescript
Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  serverName: 'bens-server',
  tracesSampleRate: 0.2,
  beforeSend(event) {
    return stripPiiFromEvent(event)
  },
})
```

- [ ] **Step 2: Add serverName to chat-server**

In `apps/chat-server/src/index.ts`, Sentry.init block:

```typescript
Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  serverName: 'bens-chat-server',
  tracesSampleRate: 0.2,
  beforeSend(event) {
    return stripPiiFromEvent(event)
  },
})
```

- [ ] **Step 3: Add serverName to worker**

In `apps/worker/src/index.ts`, Sentry.init block:

```typescript
serverName: 'bens-worker',
```

- [ ] **Step 4: Add serverName to chat-worker**

In `apps/chat-worker/src/index.ts`, Sentry.init block:

```typescript
serverName: 'bens-chat-worker',
```

- [ ] **Step 5: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/server.ts apps/chat-server/src/index.ts apps/worker/src/index.ts apps/chat-worker/src/index.ts
git commit -m "feat(observability): add Sentry serverName to distinguish services"
```

---

## Task 4: BullMQ Errors → Sentry

**Context:** Worker job failures are invisible to the team. BullMQ errors are logged via Pino but not captured in Sentry. When a job fails, there's no alert.

**Files:**

- Modify: `apps/worker/src/index.ts`
- Modify: `apps/chat-worker/src/index.ts`

- [ ] **Step 1: Add worker error handler for ERP worker**

In `apps/worker/src/index.ts`, after the processor setup block (after line ~66), add error event handlers for each worker:

```typescript
const workers = [
  auditArchive.worker,
  csvImport.worker,
  expirePolicies.worker,
  notifications.worker,
  proactiveAlerts.worker,
  sendQuoteEmail.worker,
]

for (const w of workers) {
  w.on('failed', (job, err) => {
    logger.error(
      { err, jobId: job?.id, jobName: job?.name, queue: w.name },
      'Job failed'
    )
    if (env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: { queue: w.name, jobName: job?.name },
        extra: { jobId: job?.id, attemptsMade: job?.attemptsMade },
      })
    }
  })
}
```

- [ ] **Step 2: Add worker error handler for chat-worker**

In `apps/chat-worker/src/index.ts`, same pattern after all workers are created. Find where the BullMQ workers are created and add the `failed` event handler. The subagent should read the file to find the worker variable names and add the error handlers accordingly.

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/worker/src/index.ts apps/chat-worker/src/index.ts
git commit -m "feat(observability): capture BullMQ job failures in Sentry"
```

---

## Task 5: Unify Permission System (AA-012)

**Context:** Frontend uses a hand-maintained `PERMISSION_MATRIX` in `apps/web/src/lib/permissions.ts` completely independent of the CASL `defineAbilitiesFor()` in `packages/auth/src/abilities.ts`. No mechanism ensures sync. The fix: replace `PERMISSION_MATRIX` with CASL-backed implementation.

**Key constraint:** `hasPermission(role, 'clients:delete')` maps to CASL `ability.can('delete', 'Client')`. The sidebar and client-detail page use string-based permission keys like `'insurers:manage'`, `'settings:read'`, `'audit:read'`. We need a mapping layer.

**Files:**

- Modify: `apps/web/src/lib/permissions.ts`

- [ ] **Step 1: Replace PERMISSION_MATRIX with CASL-backed implementation**

Replace the entire content of `apps/web/src/lib/permissions.ts`:

```typescript
import { defineAbilitiesFor } from '@repo/auth/abilities'
import type { Action, Subject } from '@repo/auth/abilities'
import type { Role } from '@repo/auth/roles'

const SUBJECT_MAP: Record<string, Subject> = {
  clients: 'Client',
  proposals: 'Proposal',
  policies: 'Policy',
  insurers: 'Insurer',
  commissions: 'Commission',
  claims: 'Claim',
  endorsements: 'Endorsement',
  assistances: 'Assistance',
  documents: 'Document',
  users: 'Member',
  settings: 'Organization',
  audit: 'AuditLog',
}

const ACTION_MAP: Record<string, Action> = {
  read: 'read',
  create: 'create',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
  approve: 'approve',
  'lgpd-delete': 'delete',
}

export function hasPermission(role: Role, permission: string): boolean {
  const [resource, action] = permission.split(':')
  const subject = SUBJECT_MAP[resource]
  const caslAction = ACTION_MAP[action]
  if (!subject || !caslAction) return false

  const ability = defineAbilitiesFor(role)
  return ability.can(caslAction, subject)
}

export function hasAnyPermission(role: Role, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function hasAllPermissions(role: Role, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}
```

- [ ] **Step 2: Verify CASL abilities grant ADMIN read on Organization**

Check `packages/auth/src/abilities.ts` — ADMIN needs `can('read', 'Organization')` for `settings:read` to work. Currently ADMIN doesn't have Organization access in CASL. Add it if missing:

```typescript
case 'ADMIN':
  can('manage', OPERATIONAL_SUBJECTS)
  can('manage', 'Commission')
  can('approve', 'Commission')
  can('manage', 'User')
  can('manage', 'Notification')
  can('read', 'AuditLog')
  can('read', 'Organization')  // ← ADD THIS
  can(['read', 'update', 'delete'], 'Member')
  can(['create', 'read', 'delete'], 'Invitation')
  break
```

Also ensure MANAGER gets `can('read', 'Organization')` if `settings:read` should be visible to MANAGER. Check the original PERMISSION_MATRIX to see what MANAGER had.

- [ ] **Step 3: Verify exports from @repo/auth**

Check that `defineAbilitiesFor`, `Action`, `Subject` are exported from `packages/auth/src/abilities.ts` and accessible via `@repo/auth/abilities`. Check the package.json exports map.

- [ ] **Step 4: Run typecheck and verify sidebar works**

```bash
pnpm typecheck
```

Start dev server, log in as each role, verify sidebar shows correct items.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/permissions.ts packages/auth/src/abilities.ts
git commit -m "refactor(auth): replace PERMISSION_MATRIX with CASL-backed hasPermission (AA-012)"
```

---

## Task 6: Table Action Buttons RBAC (AA-026)

**Context:** All table column files render Edit and Delete dropdown actions for every user regardless of role. VIEWER sees Delete buttons that return 403. The fix: pass `role` to column definitions and conditionally render actions.

**Files:** All 11 column files in `apps/web/src/features/*/components/*-columns.tsx`. Each follows the same pattern — a function that returns column definitions with an actions column containing a `DropdownMenu`.

**Pattern:** The actions column currently receives callbacks like `{ onView, onEdit, onDelete }`. We add `role` to the interface and conditionally render.

- [ ] **Step 1: Update clients-columns.tsx as the template**

In `apps/web/src/features/clients/components/clients-columns.tsx`, find the actions column (around line 118). The function that creates columns receives an `actions` parameter. Add `role` to it:

```typescript
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@repo/auth/roles'
```

Add `role: Role` to the actions/config parameter. Then conditionally render:

```tsx
<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => actions.onView(client.id)}>
    <Eye className="mr-2 size-4" />
    Ver
  </DropdownMenuItem>
  {hasPermission(role, 'clients:update') && (
    <DropdownMenuItem onClick={() => actions.onEdit(client.id)}>
      <Pencil className="mr-2 size-4" />
      Editar
    </DropdownMenuItem>
  )}
  {hasPermission(role, 'clients:delete') && (
    <DropdownMenuItem
      className="text-destructive"
      onClick={() => actions.onDelete(client.id)}
    >
      <Trash2 className="mr-2 size-4" />
      Excluir
    </DropdownMenuItem>
  )}
</DropdownMenuContent>
```

- [ ] **Step 2: Update the page that calls the columns to pass role**

Find where `createClientsColumns` (or equivalent) is called — typically in the page or table component. Pass the user's role from `useOrgs().activeOrg?.role ?? 'VIEWER'`.

- [ ] **Step 3: Apply same pattern to remaining 10 column files**

Apply the same pattern to each column file, using the appropriate permission string:

| File                       | Permission prefix       |
| -------------------------- | ----------------------- |
| `assistances-columns.tsx`  | `assistances:`          |
| `claims-columns.tsx`       | `claims:`               |
| `commissions-columns.tsx`  | `commissions:`          |
| `endorsements-columns.tsx` | `endorsements:`         |
| `insurers-columns.tsx`     | `insurers:`             |
| `members-columns.tsx`      | `users:`                |
| `policies-columns.tsx`     | `policies:`             |
| `proposals-columns.tsx`    | `proposals:`            |
| `channels-columns.tsx`     | `settings:`             |
| `ai-agents-columns.tsx`    | `settings:`             |
| `audit-columns.tsx`        | (no actions, read-only) |

For each: import `hasPermission` + `Role`, add `role` parameter, wrap Edit/Delete with permission checks.

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/*/components/*-columns.tsx apps/web/src/features/*/components/*-table.tsx
git commit -m "fix(rbac): conditionally render table action buttons by role (AA-026)"
```

---

## Task 7: React Query staleTime 60s → 5min

**Context:** Default `staleTime` is 60 seconds, causing excessive re-fetches. Most list data can be stale for 5 minutes.

**Files:**

- Modify: `apps/web/src/providers/index.tsx:18`

- [ ] **Step 1: Update staleTime**

In `apps/web/src/providers/index.tsx`, line 18, change:

```typescript
// Before
queries: { staleTime: 60 * 1000 },

// After
queries: { staleTime: 5 * 60 * 1000 },
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/providers/index.tsx
git commit -m "perf(web): increase React Query staleTime from 60s to 5min"
```

---

## Task 8: Missing Database Indexes

**Context:** Notification and AuditLog could benefit from composite indexes for user-scoped sorted queries.

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Check existing indexes**

Notification currently has:

```prisma
@@index([organizationId, userId, read])
@@index([organizationId, createdAt(sort: Desc)])
@@index([organizationId, entityType, entityId, type, createdAt])
```

AuditLog currently has:

```prisma
@@index([organizationId, entityType, createdAt(sort: Desc)])
@@index([organizationId, action])
@@index([organizationId, userId])
```

- [ ] **Step 2: Add user+date sorted indexes**

In the Notification model, add:

```prisma
@@index([organizationId, userId, createdAt(sort: Desc)])
```

In the AuditLog model, add:

```prisma
@@index([organizationId, userId, createdAt(sort: Desc)])
```

- [ ] **Step 3: Generate migration**

```bash
pnpm db:migrate --name add_user_sorted_indexes
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/
git commit -m "perf(db): add user+date sorted indexes on Notification and AuditLog"
```

---

## Task 9: Backup Encryption

**Context:** Backups are stored unencrypted in R2. PII (CPF, CNPJ, emails) in the PostgreSQL dump is plaintext.

**Files:**

- Modify: `scripts/backup.sh`

- [ ] **Step 1: Add encryption to backup script**

In `scripts/backup.sh`, replace the PostgreSQL backup line:

```bash
# Before
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/postgres_${DATE}.sql.gz"

# After
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY \
  > "$BACKUP_DIR/postgres_${DATE}.sql.gz.enc"
```

Same for MongoDB:

```bash
# Before
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T mongodb mongodump --archive \
  -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin \
  | gzip > "$BACKUP_DIR/mongo_${DATE}.archive.gz"

# After
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T mongodb mongodump --archive \
  -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY \
  > "$BACKUP_DIR/mongo_${DATE}.archive.gz.enc"
```

- [ ] **Step 2: Update verification checks**

Update the empty-file checks to use the new `.enc` extension:

```bash
if [ ! -s "$BACKUP_DIR/postgres_${DATE}.sql.gz.enc" ]; then
  echo "ERROR: PostgreSQL backup is empty!" >&2
  exit 1
fi

if [ ! -s "$BACKUP_DIR/mongo_${DATE}.archive.gz.enc" ]; then
  echo "ERROR: MongoDB backup is empty!" >&2
  exit 1
fi
```

- [ ] **Step 3: Update retention cleanup pattern**

```bash
find "$BACKUP_DIR" -type f \( -name "*.gz.enc" -o -name "*.gz" \) -mtime +${RETENTION_DAYS} -delete
```

- [ ] **Step 4: Add decryption instructions as comment**

Add at the top of the script:

```bash
# Restore encrypted backup:
#   openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY \
#     -in postgres_DATE.sql.gz.enc | gunzip | docker compose exec -T postgres psql -U user db
```

- [ ] **Step 5: Add BACKUP_ENCRYPTION_KEY to .env.example.prod**

```bash
# Backup encryption key (generate: openssl rand -hex 32)
BACKUP_ENCRYPTION_KEY=
```

- [ ] **Step 6: Generate key and add to production .env**

```bash
ssh bens-vps "BACKUP_KEY=\$(openssl rand -hex 32) && echo \"BACKUP_ENCRYPTION_KEY=\$BACKUP_KEY\" >> /opt/bens-seguros/.env && echo \"Key: \$BACKUP_KEY\""
```

Save the key securely.

- [ ] **Step 7: Commit**

```bash
git add scripts/backup.sh .env.example.prod
git commit -m "feat(ops): encrypt backups with AES-256-CBC before R2 upload"
```

---

## Task 10: Final Quality Gates

- [ ] **Step 1: Lint**

```bash
pnpm lint
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

- [ ] **Step 4: Test**

```bash
pnpm test
```

- [ ] **Step 5: Manual verification checklist**

- [ ] Request IDs appear in server logs (`reqId` field)
- [ ] Response headers include `x-request-id`
- [ ] Sentry events show `serverName` (bens-server, bens-chat-server, etc.)
- [ ] VIEWER cannot see Edit/Delete in table dropdowns
- [ ] COMMERCIAL can see View but not Delete in most tables
- [ ] Sidebar items match CASL abilities for each role
- [ ] React Query doesn't re-fetch data for 5 minutes

---

## Out of Scope (separate specs needed)

| Item                            | Reason                                                                  |
| ------------------------------- | ----------------------------------------------------------------------- |
| **Granular consent UI**         | Full feature (schema + API + Settings page). Needs own brainstorm/spec. |
| **Vendor DPA verification**     | Documentation-only task. No code changes.                               |
| **DR plan**                     | Documentation-only task. Involves testing restore procedure on VPS.     |
| **Privacy policy placeholders** | Blocked on CNPJ (Jira OPS-7).                                           |
