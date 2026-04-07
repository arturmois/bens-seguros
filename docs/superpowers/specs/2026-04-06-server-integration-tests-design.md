# P2-1: Integration Tests for apps/server Route Handlers

**Date:** 2026-04-06
**Status:** Approved
**Scope:** ~95 route handlers, ~111 endpoints, 15 domains

## Context

The `apps/server` has zero route-level test specs. The only existing tests cover middleware (tenant-middleware, internal-auth-middleware) and a security utility (path-traversal). Domain use cases in `packages/core` have unit tests, and RBAC is covered by `packages/auth/abilities.spec.ts`. This spec covers the missing layer: route handler integration tests.

## Decisions

| Decision      | Choice                                | Rationale                                                                                                               |
| ------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Test depth    | Integration-light with `app.inject()` | Tests real Zod validation, serialization, handler wiring, error mapping. Use cases already unit-tested in packages/core |
| Auth/tenancy  | Mock middlewares via test helper      | Middleware already tested separately. `createTestApp()` injects fake context                                            |
| RBAC coverage | Skip (already covered)                | `packages/auth/abilities.spec.ts` covers role matrix. `requireAbility` middleware is generic                            |
| Scope         | All domains in one cycle              | Effort per handler is low with mocked use cases (~3-4 tests each)                                                       |
| Batch order   | Simple → complex                      | Establish patterns with easy domains first                                                                              |

## Test Infrastructure

### `createTestApp(routePlugin, options?)`

Factory that creates a minimal Fastify instance for testing:

- Registers Zod type provider (validatorCompiler + serializerCompiler)
- Decorates request with auth/tenant fields (`user`, `session`, `organizationId`, `role`, `tenantPrisma`)
- Adds `onRequest` hook that injects configurable test context
- Registers only the route plugin under test
- Calls `app.ready()` and returns the instance

Located at: `apps/server/src/__tests__/helpers/create-test-app.ts`

### `injectAs(app, options)`

Wrapper around `app.inject()` that configures auth context per request:

```typescript
injectAs(app, {
  role: 'OWNER', // default
  orgId: TEST_ORG_ID, // default
  userId: TEST_USER_ID, // default
  method: 'POST',
  url: '/api/v1/clients',
  payload: { name: 'Test' },
})
```

### Use case mocking

Each test suite mocks `@repo/core`'s `container.resolve` to return stub use cases:

```typescript
vi.mock('@repo/core', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    container: { resolve: vi.fn() },
  }
})
```

Individual tests configure what `container.resolve(UseCase)` returns via a helper:

```typescript
mockUseCase(CreateClient, {
  execute: vi.fn().mockResolvedValue({ id: 'client-1', name: 'Test' }),
})
```

### Constants

```typescript
const TEST_ORG_ID = 'org-test-123'
const TEST_USER_ID = 'user-test-456'
const TEST_USER = {
  id: TEST_USER_ID,
  email: 'test@user.com',
  name: 'Test User',
}
```

## Test Coverage Per Handler Type

### CRUD Create

- 201 — happy path, correct response shape
- 400 — missing required field (Zod validation)
- 400 — refinement failure (e.g., CPF length vs personType)
- 404/409/422 — domain error mapped to correct HTTP status

### List with pagination

- 200 — returns `{ success, data, meta }` with pagination
- 200 — passes query filters to use case
- 400 — invalid pagination params

### Get by ID

- 200 — happy path with presenter output
- 404 — NOT_FOUND domain error
- 400 — invalid/empty ID param

### State transition (advance, pay, approve, reject, etc.)

- 200 — successful transition
- 400/409/422 — domain error for invalid transition
- 404 — entity not found

### Delete

- 200/204 — successful deletion
- 404 — not found

### File upload

- 201 — successful upload
- 400 — no file provided

### Export

- 200 — returns data/buffer

### Internal routes

- 201 — happy path (no auth middleware)
- 400 — invalid body

**Average: ~3-4 tests per handler, ~309 tests total estimated.**

## File Organization

Tests co-located with route files in `__tests__/` subdirectories:

```
apps/server/src/
  __tests__/helpers/
    create-test-app.ts
    mock-use-case.ts
  routes/v1/
    clients/__tests__/
      create-client.spec.ts
      list-clients.spec.ts
      ...
    proposals/__tests__/
      create-proposal.spec.ts
      advance-proposal.spec.ts
      ...
    (same for each domain)
  routes/internal/leads/__tests__/
    create-lead.spec.ts
    ...
  routes/terms/__tests__/
    accept-terms.spec.ts
    ...
```

## Implementation Batches

| Batch | Domain                                      | Handlers | Est. Tests | Notes                                        |
| ----- | ------------------------------------------- | -------- | ---------- | -------------------------------------------- |
| 0     | Test infra                                  | —        | —          | `createTestApp`, `injectAs`, mock helpers    |
| 1     | Insurers, Tenants, Audit Logs, Search, Chat | 8        | ~20        | Simple CRUD, establish pattern               |
| 2     | Notifications, Terms                        | 7        | ~22        | Read + simple actions                        |
| 3     | Organization, Members                       | 6        | ~20        | Settings + role management                   |
| 4     | Invitations (incl. public)                  | 5        | ~18        | Mix auth/public routes                       |
| 5     | Documents, Endorsements, Assistances        | 11       | ~35        | Upload + status transitions                  |
| 6     | Clients (incl. import/export)               | 9        | ~32        | Full CRUD + bulk operations                  |
| 7     | Claims                                      | 7        | ~25        | Nested resources (occurrences)               |
| 8     | Policies (incl. import/export)              | 10       | ~35        | State machine + bulk                         |
| 9     | Proposals                                   | 12       | ~42        | Most complex — state machine, checklist, PDF |
| 10    | Commissions                                 | 8        | ~30        | DDD full, multiple transitions               |
| 11    | Internal routes                             | 7        | ~22        | HMAC auth, cross-service                     |
| 12    | Stats (dashboard + PDF export)              | 2        | ~8         | Aggregations                                 |

Each batch = one commit. Batches 1-4 build momentum with simple handlers. Batches 6-11 are the bulk.

## What Is NOT Tested

- RBAC/permissions per handler (covered by `packages/auth/abilities.spec.ts`)
- Auth session validation (covered by `auth-middleware` spec)
- Tenant isolation (covered by `tenant-middleware` spec)
- Use case business logic (covered by `packages/core` unit tests)
- Global plugins (CORS, Helmet, rate-limit) — infra, not handler logic
- E2E with real database — separate concern (P3 backlog)
