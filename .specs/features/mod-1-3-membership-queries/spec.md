# MOD-1 Step 1.3 — Membership and user-status lookups through workspace queries Specification

## Problem Statement

Server middlewares query identity tables directly on every request: `apps/server/src/middlewares/tenant-middleware.ts:24` (`prisma.member.findUnique`), `auth-middleware.ts:29` (`prisma.user.findUnique` for `isSuperAdmin`) and `require-super-admin-2fa.ts:28` (`prisma.user.findUnique` for `twoFactorEnabled`). Step 1.3 of `docs/architecture/2026-09-13-migration-plan.md` moves these lookups behind workspace queries so middlewares depend on the workspace API. The queries must keep using the non-admin `prisma` client: switching to `prismaAdmin` (which every DI repository uses, `container-registrations.ts:496`) would bypass RLS on the membership lookup.

Baseline at `f5d957cb`: `@app/server` 114 files / 640 tests; `@repo/core` 102 files / 575 tests.

## Goals

- [ ] Zero `prisma.member.*` / `prisma.user.*` calls in `apps/server/src/middlewares/**` (non-test).
- [ ] Identical middleware behavior, proven by the three middleware spec files staying byte-identical across the move and passing.
- [ ] The lookups run on `prisma`, never `prismaAdmin`, proven by a spec.

## Out of Scope

| Feature                                                                                                                                       | Reason                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| "Banned user → 401" (listed in plan Step 1.3 tests)                                                                                           | No ban check exists in `auth-middleware.ts` today; adding it is a behavior change     |
| `auth.api.getSession` in `auth-middleware.ts`                                                                                                 | Session reading stays with Better Auth; plan Step 1.3 targets the Prisma lookups only |
| `createTenantClient` in `tenant-middleware.ts`                                                                                                | Plan: tenant client construction stays in the middleware                              |
| DI registration in `container-registrations.ts`                                                                                               | See Assumptions (module-level instances instead)                                      |
| Replacing `MemberRepository` or `prismaAdmin` usage elsewhere                                                                                 | Phase 2                                                                               |
| Prisma reads of `member`/`user` in routes (`routes/v1/commissions/*`, `routes/terms/accept-terms.ts`, `routes/internal/leads/create-lead.ts`) | Plan Step 2.3 and later                                                               |

---

## Assumptions & Open Questions

| Assumption / decision          | Chosen default                                                                                                                                                                                                                                     | Rationale                                                                                                                                                                                                                                    | Confirmed? |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Third middleware in scope      | `require-super-admin-2fa.ts` (reads `user.twoFactorEnabled`) moves too, though plan Step 1.3 names only tenant and auth middlewares                                                                                                                | Same kind of identity-table read in a middleware; lesson L-003 (grep every caller before scoping)                                                                                                                                            | n          |
| Query location and names       | `packages/core/src/modules/workspace/members/application/resolve-membership.ts` (`ResolveMembership`) and `get-user-status.ts` (`GetUserStatus` with `isSuperAdmin(userId)` and `hasTwoFactorEnabled(userId)`), exported from `workspace/index.ts` | Plan names `ResolveMembership` and `GetUserStatus`; two methods keep each middleware's exact `select`                                                                                                                                        | n          |
| Client type                    | Constructors take narrowed types: `Pick<PrismaClient, 'member'>` and `Pick<PrismaClient, 'user'>`                                                                                                                                                  | Plan §1 narrowed Prisma type per module                                                                                                                                                                                                      | n          |
| Wiring                         | No DI: `apps/server/src/lib/workspace-queries.ts` exports `resolveMembership = new ResolveMembership(prisma)` and `userStatus = new GetUserStatus(prisma)`; middlewares import these instances. Classes carry no `@injectable()`                   | Server test setup mocks `container.resolve` globally (`src/__tests__/helpers/setup.ts:5`), so DI resolution would break the unchanged middleware specs; module instances also avoid a per-request resolve and make the client choice visible | n          |
| Query result shapes            | `ResolveMembership.execute` returns `{ role, active } \| null` (403 decision stays in the middleware); `isSuperAdmin` / `hasTwoFactorEnabled` return `row?.<field> === true`                                                                       | Same Prisma calls and same boolean coercion as today                                                                                                                                                                                         | n          |
| Characterization before moving | New `middlewares/__tests__/auth-middleware.spec.ts` (none exists); tenant and 2FA specs already assert the exact Prisma calls and every branch                                                                                                     | Plan: characterization specs before moving logic                                                                                                                                                                                             | n          |
| Delivery                       | 3 commits: (1) auth-middleware characterization spec, (2) core queries + unit specs, (3) server lib + middleware switch + client-choice spec                                                                                                       | Each commit green and revertable                                                                                                                                                                                                             | n          |

**Open questions:** none — all logged above.

---

## User Stories

### P1: Auth middleware behavior pinned ⭐ MVP

**User Story**: As the engineer moving the super-admin lookup, I want a spec for `auth-middleware.ts` so that any change in the request user it builds fails a test.

**Why P1**: It has no spec today and runs on every authenticated request.

**Acceptance Criteria**:

1. WHEN `auth.api.getSession` resolves `null` THEN the auth middleware SHALL reply 401 with body `{ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }` and SHALL NOT call `prisma.user.findUnique`. <!-- MR-01 -->
2. WHEN a session exists THEN the auth middleware SHALL call `prisma.user.findUnique({ where: { id: <session user id> }, select: { isSuperAdmin: true } })`. <!-- MR-02 -->
3. WHEN the user row has `isSuperAdmin: true` THEN `request.user.isSuperAdmin` SHALL be `true`, and `request.user` SHALL copy `id`, `email`, `name`, `emailVerified`, `image` from the session user; `request.session` SHALL equal `session.session`. <!-- MR-03 -->
4. IF the user row is `null` or has `isSuperAdmin: false` THEN `request.user.isSuperAdmin` SHALL be `false`. <!-- MR-04 -->
5. WHEN a request header value is an array THEN `auth.api.getSession` SHALL receive that header joined by `, `. <!-- MR-05 -->
6. The auth middleware characterization spec SHALL pass against the code at `f5d957cb`. <!-- MR-06 -->

**Independent Test**: Commit 1 adds only the spec file; `pnpm --filter @app/server test` passes.

---

### P1: Workspace queries in core ⭐ MVP

**User Story**: As a middleware author, I want workspace queries for membership and user status so that middlewares don't touch identity tables.

**Why P1**: Plan Step 1.3 target state.

**Acceptance Criteria**:

1. WHEN `ResolveMembership.execute({ userId, organizationId })` runs THEN it SHALL call `member.findUnique({ where: { organizationId_userId: { organizationId, userId } } })` once and return `{ role, active }` from the row, or `null` when no row exists. <!-- MR-07 -->
2. WHEN `GetUserStatus.isSuperAdmin(userId)` runs THEN it SHALL call `user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } })` and return `true` only when the returned field is `true` (row `null` or field `false` → `false`). <!-- MR-08 -->
3. WHEN `GetUserStatus.hasTwoFactorEnabled(userId)` runs THEN it SHALL call `user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } })` and return `true` only when the returned field is `true`. <!-- MR-09 -->
4. `workspace/index.ts` SHALL export `ResolveMembership` and `GetUserStatus` in addition to the 66 names it exported at `f5d957cb`. <!-- MR-10 -->
5. The constructor parameter of `ResolveMembership` SHALL be typed `Pick<PrismaClient, 'member'>` and of `GetUserStatus` `Pick<PrismaClient, 'user'>`. <!-- MR-11 -->

**Independent Test**: `pnpm --filter @repo/core test` with fake narrowed clients.

---

### P1: Middlewares use workspace queries on the non-admin client ⭐ MVP

**User Story**: As a maintainer, I want middlewares to depend on the workspace API while keeping RLS behavior so that the membership check stays tenant-safe.

**Why P1**: Plan Step 1.3 expected outcome and its main risk (prismaAdmin bypassing RLS).

**Acceptance Criteria**:

1. `apps/server/src/lib/workspace-queries.ts` SHALL construct `ResolveMembership` and `GetUserStatus` with `prisma` from `@repo/db` and SHALL NOT reference `prismaAdmin`. <!-- MR-12 -->
2. WHEN the lib's queries run with `@repo/db` mocked to distinct `prisma` and `prismaAdmin` objects THEN the Prisma calls SHALL land on `prisma` and `prismaAdmin` SHALL receive no calls. <!-- MR-13 -->
3. `tenant-middleware.ts` SHALL import only `createTenantClient` from `@repo/db`; `auth-middleware.ts` and `require-super-admin-2fa.ts` SHALL NOT import `@repo/db`; no file under `apps/server/src/middlewares/` (non-test) SHALL contain `prisma.member.` or `prisma.user.`. <!-- MR-14 -->
4. WHEN the move commit is applied THEN `middlewares/__tests__/tenant-middleware.spec.ts`, `require-super-admin-2fa.spec.ts` (both unchanged since `f5d957cb`) and `auth-middleware.spec.ts` (unchanged since its characterization commit) SHALL be byte-identical and SHALL pass. <!-- MR-15 -->
5. `apps/server/src/container-registrations.ts` SHALL be unchanged from `f5d957cb`. <!-- MR-16 -->
6. WHEN the 4 root gates run (`pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`) THEN each SHALL exit 0, with `@app/server` ≥ 116 files and `@repo/core` ≥ 104 files, 0 failed. <!-- MR-17 -->

**Independent Test**: grep middlewares for `@repo/db` and `prisma.(member|user).`; empty `git diff` for the three spec files and `container-registrations.ts`; gates.

---

## Edge Cases

- IF the member row exists with `active: false` THEN the tenant middleware SHALL still reply 403 `FORBIDDEN` (covered by the unchanged tenant spec).
- IF the user row is deleted mid-session THEN `require-super-admin-2fa` SHALL still reply 403 `TWO_FACTOR_REQUIRED` (covered by the unchanged 2FA spec).
- WHEN `request.role` is assigned from `ResolveMembership` THEN it SHALL type-check against `Role` from `@repo/auth/roles` without an `as` assertion.

---

## Requirement Traceability

| Requirement ID | Story                       | Phase   | Status       |
| -------------- | --------------------------- | ------- | ------------ |
| MR-01          | P1: Auth middleware pinned  | Execute | Implementing |
| MR-02          | P1: Auth middleware pinned  | Execute | Implementing |
| MR-03          | P1: Auth middleware pinned  | Execute | Implementing |
| MR-04          | P1: Auth middleware pinned  | Execute | Implementing |
| MR-05          | P1: Auth middleware pinned  | Execute | Implementing |
| MR-06          | P1: Auth middleware pinned  | Execute | Implementing |
| MR-07          | P1: Workspace queries       | Execute | Implementing |
| MR-08          | P1: Workspace queries       | Execute | Implementing |
| MR-09          | P1: Workspace queries       | Execute | Implementing |
| MR-10          | P1: Workspace queries       | Execute | Implementing |
| MR-11          | P1: Workspace queries       | Execute | Implementing |
| MR-12          | P1: Middlewares use queries | Execute | Implementing |
| MR-13          | P1: Middlewares use queries | Execute | Implementing |
| MR-14          | P1: Middlewares use queries | Execute | Implementing |
| MR-15          | P1: Middlewares use queries | Execute | Implementing |
| MR-16          | P1: Middlewares use queries | Execute | Implementing |
| MR-17          | P1: Middlewares use queries | Execute | Implementing |

**Coverage:** 17 total, 17 mapped to execution steps, 0 unmapped.

---

## Success Criteria

- [ ] 5 quality gates green.
- [ ] `grep -rnE "prisma(Admin)?\.(member|user)\." apps/server/src/middlewares` (non-test) returns nothing.
