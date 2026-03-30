# Orval + OpenAPI Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate frontend hooks, types, and Zod schemas from backend OpenAPI spec via Orval, eliminating manual duplication.

**Architecture:** Backend routes split into individual files with co-located schemas using Fastify route options + ZodTypeProvider. @fastify/swagger generates OpenAPI spec. Orval reads spec and generates React Query hooks + types + Zod schemas for frontend.

**Tech Stack:** Fastify 5, fastify-type-provider-zod, @fastify/swagger, @scalar/fastify-api-reference, Orval, TanStack React Query, Zod

**Spec:** `docs/superpowers/specs/2026-03-29-orval-openapi-integration-design.md`

---

## Task 1: Create shared schemas (`_shared/`)

**Files:**

- Create: `apps/server/src/routes/_shared/transforms.ts`
- Create: `apps/server/src/routes/_shared/pagination.schema.ts`
- Create: `apps/server/src/routes/_shared/params.schema.ts`
- Create: `apps/server/src/routes/_shared/date-range.schema.ts`
- Create: `apps/server/src/routes/_shared/enums.schema.ts`
- Create: `apps/server/src/routes/_shared/response.schema.ts`

- [ ] **Step 1: Create transforms.ts**

```ts
import { z } from 'zod'

export const emptyToUndefined = z.literal('').transform(() => undefined)
export const optionalString = z.union([emptyToUndefined, z.string()]).optional()
export const optionalDate = z
  .union([emptyToUndefined, z.coerce.date()])
  .optional()
export const optionalEmail = z
  .union([emptyToUndefined, z.string().email()])
  .optional()
```

- [ ] **Step 2: Create pagination.schema.ts**

```ts
import { z } from 'zod'

export function paginationQuery(defaultLimit = 20, maxLimit = 100) {
  return z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(maxLimit).default(defaultLimit),
  })
}
```

- [ ] **Step 3: Create params.schema.ts**

```ts
import { z } from 'zod'

export const idParam = z.object({ id: z.string().min(1) })
export const uuidParam = z.object({ id: z.string().uuid() })
```

- [ ] **Step 4: Create date-range.schema.ts**

```ts
import { z } from 'zod'

export const dateRangeQuery = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})
```

- [ ] **Step 5: Create enums.schema.ts**

Consolidate all enum schemas from across the codebase. Reference current values in:

- `apps/server/src/schemas/proposal.schemas.ts` (branch, stage, boardType)
- `apps/server/src/schemas/client.schemas.ts` (clientType, maritalStatus)
- `apps/server/src/schemas/member.schemas.ts` (role)
- `apps/server/src/schemas/claim.schemas.ts` (claimStatus, priority)
- `apps/server/src/schemas/commission.schemas.ts` (commissionStatus)
- `apps/server/src/schemas/policy.schemas.ts` (policyStatus, branch)
- `apps/server/src/schemas/assistance.schemas.ts` (assistanceStatus, assistanceType)
- `apps/server/src/schemas/document.schemas.ts` (entityType, documentType)

```ts
import { z } from 'zod'

// Domain enums - keep only cross-cutting ones here
// Entity-specific enums stay in their _schemas.ts
export const branchEnum = z.enum([
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
])
export const roleEnum = z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'])
export const fullRoleEnum = z.enum([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'COMMERCIAL',
  'VIEWER',
])
export const maritalStatusEnum = z.enum([
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'OTHER',
])
export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
```

- [ ] **Step 6: Create response.schema.ts**

```ts
import { z } from 'zod'

export function successResponse<T extends z.ZodType>(dataSchema: T) {
  return z.object({ success: z.literal(true), data: dataSchema })
}

export function paginatedResponse<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: z.object({
      total: z.number(),
      nextCursor: z.string().nullable(),
    }),
  })
}

export const errorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
})
```

- [ ] **Step 7: Verify typecheck**

Run: `pnpm --filter @app/server exec tsc --noEmit`
Expected: PASS (new files are standalone, no imports from them yet)

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/routes/_shared/
git commit -m "feat(server): add shared route schemas (_shared/)"
```

---

## Task 2: Split client routes

**Files:**

- Create: `apps/server/src/routes/v1/clients/_schemas.ts`
- Create: `apps/server/src/routes/v1/clients/create-client.ts`
- Create: `apps/server/src/routes/v1/clients/get-client.ts`
- Create: `apps/server/src/routes/v1/clients/list-clients.ts`
- Create: `apps/server/src/routes/v1/clients/update-client.ts`
- Create: `apps/server/src/routes/v1/clients/delete-client.ts`
- Create: `apps/server/src/routes/v1/clients/export-clients.ts`
- Create: `apps/server/src/routes/v1/clients/import-clients.ts`
- Create: `apps/server/src/routes/v1/clients/index.ts`
- Delete: `apps/server/src/routes/v1/client-routes.ts`
- Modify: `apps/server/src/app.ts` (update import)

**Reference:** Read `apps/server/src/routes/v1/client-routes.ts` (325 lines) and `apps/server/src/schemas/client.schemas.ts` for current implementation.

- [ ] **Step 1: Create `clients/_schemas.ts`**

Move schemas from `apps/server/src/schemas/client.schemas.ts` into `_schemas.ts`. Import shared transforms/pagination/params from `_shared/`. Add response schemas for OpenAPI spec. Define `clientData` schema matching what the handlers currently return (check Prisma select/include in use cases).

- [ ] **Step 2: Create each route file**

For each of the 10 routes in `client-routes.ts`, create a dedicated file following this pattern:

- Import `ZodTypeProvider` and use `app.withTypeProvider<ZodTypeProvider>().route({...})`
- Move `schema: { tags: ['Clients'], summary, body/querystring/params, response }` into route options
- Move handler logic as-is from `client-routes.ts`
- Export a named function: `export function createClientRoute(app: FastifyInstance)`

Import routes group: `POST /api/v1/clients/import`, `POST .../import/:jobId/confirm`, `GET .../import/:jobId/status` can live together in `import-clients.ts` since they're a cohesive flow.

- [ ] **Step 3: Create `clients/index.ts`**

Register all routes. Apply `tenantMiddleware` once at the plugin level (same as current `client-routes.ts` does).

```ts
import type { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { createClientRoute } from './create-client.js'
import { getClientRoute } from './get-client.js'
import { listClientsRoute } from './list-clients.js'
import { updateClientRoute } from './update-client.js'
import { deleteClientRoute } from './delete-client.js'
import { exportClientsRoute } from './export-clients.js'
import { importClientsRoutes } from './import-clients.js'

export default async function clientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  createClientRoute(app)
  getClientRoute(app)
  listClientsRoute(app)
  updateClientRoute(app)
  deleteClientRoute(app)
  exportClientsRoute(app)
  importClientsRoutes(app)
}
```

- [ ] **Step 4: Update `app.ts` import**

Change: `import { clientRoutes } from './routes/v1/client-routes.js'`
To: `import clientRoutes from './routes/v1/clients/index.js'`

- [ ] **Step 5: Delete old file**

Delete `apps/server/src/routes/v1/client-routes.ts` and `apps/server/src/schemas/client.schemas.ts`.

- [ ] **Step 6: Verify**

Run: `pnpm --filter @app/server exec tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor(server): split client-routes into individual files with co-located schemas"
```

---

## Task 3: Split proposal routes

Same pattern as Task 2. **Reference:** `apps/server/src/routes/v1/proposal-routes.ts` (337 lines, 11 routes).

**Files to create:**

- `apps/server/src/routes/v1/proposals/_schemas.ts` — includes `proposal-details.schemas.ts` content (discriminated union)
- `apps/server/src/routes/v1/proposals/create-proposal.ts`
- `apps/server/src/routes/v1/proposals/get-proposal.ts`
- `apps/server/src/routes/v1/proposals/list-proposals.ts`
- `apps/server/src/routes/v1/proposals/export-proposals.ts`
- `apps/server/src/routes/v1/proposals/advance-proposal.ts`
- `apps/server/src/routes/v1/proposals/mark-proposal-lost.ts`
- `apps/server/src/routes/v1/proposals/reopen-proposal.ts`
- `apps/server/src/routes/v1/proposals/update-proposal-details.ts`
- `apps/server/src/routes/v1/proposals/generate-proposal-pdf.ts`
- `apps/server/src/routes/v1/proposals/get-proposal-checklist.ts`
- `apps/server/src/routes/v1/proposals/complete-checklist-item.ts`
- `apps/server/src/routes/v1/proposals/index.ts`
- Delete: `apps/server/src/routes/v1/proposal-routes.ts`, `apps/server/src/schemas/proposal.schemas.ts`, `apps/server/src/schemas/proposal-details.schemas.ts`
- Modify: `apps/server/src/app.ts`

Follow identical steps as Task 2. Merge `proposal.schemas.ts` + `proposal-details.schemas.ts` into single `_schemas.ts`.

---

## Task 4: Split policy routes

Same pattern. **Reference:** `apps/server/src/routes/v1/policy-routes.ts` (393 lines, 10 routes).

**Files to create:**

- `apps/server/src/routes/v1/policies/_schemas.ts`
- `apps/server/src/routes/v1/policies/issue-policy.ts`
- `apps/server/src/routes/v1/policies/get-policy.ts`
- `apps/server/src/routes/v1/policies/list-policies.ts`
- `apps/server/src/routes/v1/policies/export-policies.ts`
- `apps/server/src/routes/v1/policies/cancel-policy.ts`
- `apps/server/src/routes/v1/policies/generate-policy-pdf.ts`
- `apps/server/src/routes/v1/policies/import-policies.ts`
- `apps/server/src/routes/v1/policies/index.ts`
- Delete: `apps/server/src/routes/v1/policy-routes.ts`, `apps/server/src/schemas/policy.schemas.ts`
- Modify: `apps/server/src/app.ts`

---

## Task 5: Split claim routes

Same pattern. **Reference:** `apps/server/src/routes/v1/claim-routes.ts` (208 lines, 7 routes including occurrences).

**Files to create:**

- `apps/server/src/routes/v1/claims/_schemas.ts` — merge `claim.schemas.ts` + `occurrence.schemas.ts`
- `apps/server/src/routes/v1/claims/create-claim.ts`
- `apps/server/src/routes/v1/claims/get-claim.ts`
- `apps/server/src/routes/v1/claims/list-claims.ts`
- `apps/server/src/routes/v1/claims/update-claim-status.ts`
- `apps/server/src/routes/v1/claims/delete-claim.ts`
- `apps/server/src/routes/v1/claims/create-occurrence.ts`
- `apps/server/src/routes/v1/claims/list-occurrences.ts`
- `apps/server/src/routes/v1/claims/index.ts`
- Delete: `apps/server/src/routes/v1/claim-routes.ts`, `apps/server/src/schemas/claim.schemas.ts`, `apps/server/src/schemas/occurrence.schemas.ts`
- Modify: `apps/server/src/app.ts`

---

## Task 6: Split commission routes

Same pattern. **Reference:** `apps/server/src/routes/v1/commission-routes.ts` (303 lines, 8 routes).

**Files to create:**

- `apps/server/src/routes/v1/commissions/_schemas.ts`
- `apps/server/src/routes/v1/commissions/list-commissions.ts`
- `apps/server/src/routes/v1/commissions/get-commission.ts`
- `apps/server/src/routes/v1/commissions/export-commissions.ts`
- `apps/server/src/routes/v1/commissions/approve-commercial.ts`
- `apps/server/src/routes/v1/commissions/approve-admin.ts`
- `apps/server/src/routes/v1/commissions/reject-commission.ts`
- `apps/server/src/routes/v1/commissions/pay-commission.ts`
- `apps/server/src/routes/v1/commissions/reverse-commission.ts`
- `apps/server/src/routes/v1/commissions/index.ts`
- Delete: `apps/server/src/routes/v1/commission-routes.ts`, `apps/server/src/schemas/commission.schemas.ts`
- Modify: `apps/server/src/app.ts`

---

## Task 7: Split remaining small route files (batch)

Split all remaining route files in one task since they're smaller (40-250 lines each).

**Files to split:**

| Old File                                                       | New Dir           | Routes            |
| -------------------------------------------------------------- | ----------------- | ----------------- |
| `endorsement-routes.ts` (88 lines)                             | `endorsements/`   | 3 routes          |
| `assistance-routes.ts` (122 lines)                             | `assistances/`    | 4 routes          |
| `document-routes.ts` (124 lines)                               | `documents/`      | 4 routes          |
| `insurer-routes.ts` (101 lines)                                | `insurers/`       | 2 routes          |
| `member-routes.ts` (218 lines)                                 | `members/`        | 3 routes          |
| `invitation-routes.ts` (246 lines)                             | `invitations/`    | 3 routes          |
| `organization-routes.ts` (309 lines)                           | `organization/`   | 3 routes          |
| `notification-routes.ts` (98 lines)                            | `notifications/`  | 5 routes          |
| `audit-log-routes.ts` (57 lines)                               | `audit-logs/`     | 1 route           |
| `search-routes.ts` (170 lines)                                 | `search/`         | 1 route           |
| `chat-token-route.ts` (40 lines)                               | `chat/`           | 1 route           |
| `tenant-routes.ts` (74 lines)                                  | `tenants/`        | 1 route           |
| `stats-routes.ts` (116 lines) + `stats-helpers.ts` (435 lines) | `stats/`          | 2 routes + helper |
| `terms-routes.ts` (96 lines)                                   | `terms/`          | 2 routes          |
| `internal/lead-routes.ts` (93 lines)                           | `internal/leads/` | 1 route           |

For each:

1. Create `_schemas.ts` (move from corresponding `schemas/*.schemas.ts`)
2. Create individual route files
3. Create `index.ts` with `tenantMiddleware` hook
4. Update import in `app.ts`
5. Delete old route file and old schema file

**Also delete:** `apps/server/src/schemas/shared.ts` (move `jsonValueSchema`/`jsonObjectSchema` into `_shared/transforms.ts` or into `endorsements/_schemas.ts` and `claims/_schemas.ts` where they're actually used)

- [ ] **Step 1-14:** Split each route group following Task 2 pattern
- [ ] **Step 15:** Delete all old files in `apps/server/src/schemas/` and old route files
- [ ] **Step 16:** Update all imports in `apps/server/src/app.ts`
- [ ] **Step 17:** Verify: `pnpm --filter @app/server exec tsc --noEmit`
- [ ] **Step 18:** Commit: `refactor(server): split remaining routes into individual files`

---

## Task 8: Activate Scalar UI + verify OpenAPI spec

**Files:**

- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Register Scalar in app.ts**

After the swagger registration block (line 85-92), add:

```ts
await app.register(import('@scalar/fastify-api-reference'), {
  routePrefix: '/api/docs',
})
```

- [ ] **Step 2: Start server and verify**

Run: `pnpm --filter @app/server dev`
Visit: `http://localhost:3001/api/docs` — verify Scalar UI loads
Visit: `http://localhost:3001/api/docs/json` — verify OpenAPI spec JSON is complete

Check that:

- All routes appear with correct HTTP methods
- Tags group routes by domain (Clients, Proposals, etc.)
- Request body schemas are visible
- Response schemas are visible
- Query/path parameters are documented

- [ ] **Step 3: Fix any missing routes in the spec**

If routes don't appear, ensure they use `app.withTypeProvider<ZodTypeProvider>().route({...})` with `schema` option. Routes without `schema` won't show in Swagger.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(server): activate Scalar API docs at /api/docs"
```

---

## Task 9: Full backend quality gate

- [ ] **Step 1: Run all quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

All must pass. Fix any issues.

- [ ] **Step 2: Commit fixes if needed**

---

## Task 10: Install and configure Orval

**Files:**

- Modify: `apps/web/package.json`
- Create: `apps/web/orval.config.ts`
- Create: `apps/web/src/lib/api-mutator.ts`
- Modify: `apps/web/.gitignore` (if needed)

- [ ] **Step 1: Install Orval**

```bash
pnpm --filter @app/web add -D orval
```

- [ ] **Step 2: Create `orval.config.ts`**

Create `apps/web/orval.config.ts` with the two entries (react-query + zod) as defined in the spec. Read the spec at `docs/superpowers/specs/2026-03-29-orval-openapi-integration-design.md` for exact config.

- [ ] **Step 3: Create `api-mutator.ts`**

Create `apps/web/src/lib/api-mutator.ts`. Read current `apps/web/src/lib/api-client.ts` first to understand the existing API wrapper. The mutator must adapt Orval's call signature to the existing `api` object.

- [ ] **Step 4: Add generate:api script**

Add to `apps/web/package.json` scripts:

```json
"generate:api": "orval"
```

- [ ] **Step 5: Run first generation**

Start backend first: `pnpm --filter @app/server dev`
Then generate: `pnpm --filter @app/web generate:api`

Verify output in `apps/web/src/api/` — should have endpoints/ and model/ directories.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(web): add Orval configuration and API code generation"
```

---

## Task 11: Create global pt-BR Zod error map

**Files:**

- Create: `apps/web/src/lib/zod-pt-br.ts`
- Modify: `apps/web/src/providers/index.tsx` (or `app/layout.tsx`)

- [ ] **Step 1: Create zod-pt-br.ts**

Create the error map as specified in the design spec. Cover all Zod issue codes: `invalid_type`, `too_small`, `too_big`, `invalid_string`, `invalid_enum_value`, `invalid_date`, `custom`.

- [ ] **Step 2: Import in providers**

Add `import '@/lib/zod-pt-br'` as a side-effect import in the providers or layout file (whichever runs first on client side).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): add global pt-BR Zod error map for form validation"
```

---

## Task 12: Migrate frontend — replace hooks and types (per feature)

This is the largest task. For each feature directory in `apps/web/src/features/`:

**Pattern:**

1. Read the current hooks file to identify which hooks have custom logic (toasts, cache invalidation, optimistic updates, socket.io)
2. Replace simple hooks (pure data fetching/mutation) with Orval-generated imports from `@/api/endpoints/<tag>/<tag>`
3. For hooks with custom logic: create thin wrapper that imports the Orval-generated hook and adds the custom behavior (toasts, invalidation, etc.)
4. Replace type imports from `../types/index.ts` with imports from `@/api/model/<type>`
5. Replace Zod schema imports from `../lib/schemas.ts` with imports from `@/api/endpoints/<tag>/<tag>.zod`
6. Update all component imports
7. Delete the old manual hooks, types, and schema files

**DO NOT migrate these (out of scope):**

- `features/chat/hooks/use-messages.ts` — Socket.IO, complex optimistic updates
- `features/chat/hooks/use-socket.ts` — Socket.IO connection management
- `features/chat/hooks/use-message-socket-handlers.ts` — Socket.IO event handlers
- `features/chat/hooks/use-conversations.ts` — Socket.IO + REST mix
- `features/chat/hooks/use-unread-counts.ts` — Socket.IO events
- `features/auth/hooks/use-auth.ts` — Better Auth integration, not regular REST
- `features/org/hooks/use-orgs.ts` — custom fetch with no schema, tenant switching

**Features to migrate (in order of complexity, simple first):**

1. audit-logs (1 hook, no custom logic)
2. endorsements (2 hooks, toasts only)
3. insurers (if hooks exist)
4. notifications (4 hooks, refetch intervals)
5. assistances (4 hooks, toasts)
6. documents (4 hooks, FormData upload needs wrapper)
7. claims (7 hooks, toasts + email)
8. clients (5 hooks + import hooks, toasts)
9. proposals (6 hooks + kanban + PDF + checklist, complex)
10. policies (5 hooks + PDF + import, complex)
11. commissions (8 hooks + CSV export, complex)
12. members (6 hooks, error code handling)
13. organization (3 hooks, logo upload)
14. dashboard (2 hooks, cookie gating)
15. channels (4 hooks, chat API not main API — keep manual)
16. ai-agents (5 hooks, chat API — keep manual)
17. legal/terms (1 hook, simple)

For each feature:

- [ ] Replace hooks with Orval imports + wrappers
- [ ] Replace type imports with `@/api/model/` imports
- [ ] Replace Zod schema imports with `.zod.ts` imports
- [ ] Update all component imports
- [ ] Delete old hook/type/schema files
- [ ] Verify: `pnpm typecheck`
- [ ] Commit per feature group

**Note on chat API hooks:** `channels`, `ai-agents`, and all `chat/` hooks use `chat-api.ts` (port 3002), not the main server API. These stay manual — Orval only covers the main server API.

---

## Task 13: Clean up old schemas directory

**Files:**

- Delete: `apps/server/src/schemas/` (entire directory, all files already moved to route `_schemas.ts`)

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "from.*schemas/" apps/server/src/ --include="*.ts" | grep -v "_schemas" | grep -v node_modules
```

Should return nothing.

- [ ] **Step 2: Delete directory**
- [ ] **Step 3: Commit**

```bash
git commit -m "chore(server): remove old schemas directory (moved to route _schemas.ts)"
```

---

## Task 14: Final quality gates

- [ ] **Step 1: Run all backend quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

- [ ] **Step 2: Run frontend quality gates**

```bash
pnpm --filter @app/web typecheck
pnpm --filter @app/web lint
pnpm --filter @app/web build
```

- [ ] **Step 3: Verify Orval generation is clean**

```bash
pnpm --filter @app/web generate:api
```

Should produce no diff if already committed.

- [ ] **Step 4: Fix any issues and commit**

---

## Task 15: Code review + QA

- [ ] **Step 1: Code review** — Run `superpowers:requesting-code-review` skill
- [ ] **Step 2: QA with Playwright** — Test all routes via browser: verify Scalar docs load, spot-check key flows (create client, list proposals, dashboard)
- [ ] **Step 3: Fix any issues found**
- [ ] **Step 4: Final commit and PR**
