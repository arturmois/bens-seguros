# Validation: MOD-1 Step 1.3 — Membership queries - PASS

**Verdict**: PASS
**Date**: 2026-09-13
**Spec**: `.specs/features/mod-1-3-membership-queries/spec.md`
**Diff range**: `f5d957cb..87510833` (1c75c0fc test, 7611b730 feat core, 87510833 refactor server)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

No `tasks.md` exists for this feature; delivery follows the 3-commit plan in spec Assumptions ("Delivery"). All three commits are present in the range.

| Commit   | Content                                                                             | Status  |
| -------- | ----------------------------------------------------------------------------------- | ------- |
| 1c75c0fc | `apps/server/src/middlewares/__tests__/auth-middleware.spec.ts` only (plus spec.md) | ✅ Done |
| 7611b730 | `ResolveMembership`, `GetUserStatus` + specs, `workspace/index.ts` exports          | ✅ Done |
| 87510833 | `lib/workspace-queries.ts` + spec, 3 middlewares switched                           | ✅ Done |

---

## Behavior parity (middleware diff f5d957cb → 87510833)

- `tenant-middleware.ts`: import narrowed to `createTenantClient` (`tenant-middleware.ts:2`). The Prisma call moved verbatim into `resolve-membership.ts:20-27` (`member.findUnique({ where: { organizationId_userId: { organizationId, userId } } })`, no `select`). Branch order 400 → 401 → 403 and all bodies unchanged (`tenant-middleware.ts:10-37`). `!member || !member.active` kept (`:29`). The assignments to `organizationId`, `role` and `tenantPrisma` are unchanged (`:38-40`). The query returns `{ role, active }`, so `member.role` is still `Role`. It type-checks without `as`.
- `auth-middleware.ts`: the header join loop, the 401 body and the `user`/`session` assignments are unchanged (`auth-middleware.ts:11-39`). `dbUser?.isSuperAdmin === true` became `await userStatus.isSuperAdmin(sessionUser.id)`, which returns `user?.isSuperAdmin === true` (`get-user-status.ts:13`) with the same `where`/`select` (`:9-12`). The lookup still runs only after the session check (`auth-middleware.ts:22-29`).
- `require-super-admin-2fa.ts`: `dbUser?.twoFactorEnabled !== true` → `!(await hasTwoFactorEnabled())`, where the query returns `row?.twoFactorEnabled === true` (`get-user-status.ts:21`). Equivalence table:

  | Row                           | old `!== true` (403?) | new `=== true` | `!new` (403?) |
  | ----------------------------- | --------------------- | -------------- | ------------- |
  | `{ twoFactorEnabled: true }`  | false                 | true           | false         |
  | `{ twoFactorEnabled: false }` | true                  | false          | true          |
  | `{ twoFactorEnabled: null }`  | true                  | false          | true          |
  | `{}` (undefined field)        | true                  | false          | true          |
  | `null` (missing row)          | true                  | false          | true          |

  Equivalent in every case. The 401/403 FORBIDDEN branches and the TWO_FACTOR_REQUIRED body are unchanged (`require-super-admin-2fa.ts:14-38`).

---

## Spec-Anchored Acceptance Criteria

| AC    | Spec-defined outcome                                                                         | `file:line` + assertion                                                                                                                                                                                                                                                                                                                                            | Result  |
| ----- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| MR-01 | no session → 401, exact body, no `user.findUnique`                                           | `apps/server/src/middlewares/__tests__/auth-middleware.spec.ts:67-72` - `expect(reply.status).toHaveBeenCalledWith(401)`; `expect(reply.send).toHaveBeenCalledWith({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } })`; `expect(findUniqueMock).not.toHaveBeenCalled()`                                                      | ✅ PASS |
| MR-02 | `user.findUnique({ where: { id }, select: { isSuperAdmin: true } })`                         | `auth-middleware.spec.ts:80-83` - `expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { isSuperAdmin: true } })`                                                                                                                                                                                                                       | ✅ PASS |
| MR-03 | `request.user` copies 5 fields + `isSuperAdmin: true`; `request.session === session.session` | `auth-middleware.spec.ts:91-99` - `expect(request.user).toEqual({...isSuperAdmin: true})`; `expect(request.session).toBe(sessionRecord)`                                                                                                                                                                                                                           | ✅ PASS |
| MR-04 | row null / `false` → `isSuperAdmin: false`                                                   | `auth-middleware.spec.ts:103-112` - `it.each` null / `{isSuperAdmin:false}` → `expect(request.user).toMatchObject({ isSuperAdmin: false })`                                                                                                                                                                                                                        | ✅ PASS |
| MR-05 | array header joined with `, `                                                                | `auth-middleware.spec.ts:123-128` - `expect(getSession).toHaveBeenCalledWith({ headers: { cookie: 'session=abc', 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } })`                                                                                                                                                                                                     | ✅ PASS |
| MR-06 | characterization spec passes on pre-move code                                                | Isolated `git worktree add --detach <scratch>/wt-char 1c75c0fc` (`git diff f5d957cb -- apps/server/src/middlewares/auth-middleware.ts apps/server/src/lib` empty; middleware still has `prisma.user.findUnique` at `auth-middleware.ts:29`). `pnpm install --offline` then `vitest run src/middlewares/__tests__/auth-middleware.spec.ts` → 1 file, 6 tests passed | ✅ PASS |
| MR-07 | `member.findUnique` by compound key once; returns `{role, active}` or `null`                 | `packages/core/src/modules/workspace/members/application/resolve-membership.spec.ts:16-21` - `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith({ where: { organizationId_userId: { organizationId: 'org-1', userId: 'user-1' } } })`; `:36` `expect(result).toEqual({ role: 'ADMIN', active: false })`; `:45` `expect(result).toBeNull()`                         | ✅ PASS |
| MR-08 | `select: { isSuperAdmin: true }`; true only when field `true`                                | `packages/core/src/modules/workspace/members/application/get-user-status.spec.ts:16-19` - `toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { isSuperAdmin: true } })`; `:24` `.toBe(true)`; `:27-33` false/null → `.toBe(false)`                                                                                                                           | ✅ PASS |
| MR-09 | `select: { twoFactorEnabled: true }`; true only when field `true`                            | `get-user-status.spec.ts:44-47` - `toHaveBeenCalledWith({ where: { id: 'user-2' }, select: { twoFactorEnabled: true } })`; `:52` `.toBe(true)`; `:55-62` false/null field/missing row → `.toBe(false)`                                                                                                                                                             | ✅ PASS |
| MR-10 | index exports the 66 names from f5d957cb + `ResolveMembership`, `GetUserStatus`              | `packages/core/src/modules/workspace/index.ts:33,35`. The parsed export names at f5d957cb are 66 and at 87510833 are 72; the name diff is only additions (`GetUserStatus`, `ResolveMembership`, plus types `UserStatusDb`, `Membership`, `MembershipDb`, `ResolveMembershipInput`), with 0 removals                                                                | ✅ PASS |
| MR-11 | constructor params `Pick<PrismaClient,'member'>` / `Pick<PrismaClient,'user'>`               | `resolve-membership.ts:3,16` - `type MembershipDb = Pick<PrismaClient, 'member'>`, `constructor(private readonly db: MembershipDb)`; `get-user-status.ts:3,6` - `Pick<PrismaClient, 'user'>`                                                                                                                                                                       | ✅ PASS |
| MR-12 | lib constructs both with `prisma`, no `prismaAdmin`                                          | `apps/server/src/lib/workspace-queries.ts:2` `import { prisma } from '@repo/db'`; `:5-6` `new ResolveMembership(prisma)`, `new GetUserStatus(prisma)`; `grep prismaAdmin` on the file returns nothing                                                                                                                                                              | ✅ PASS |
| MR-13 | calls land on `prisma`, `prismaAdmin` receives none                                          | `apps/server/src/lib/__tests__/workspace-queries.spec.ts:34-35,40-41,46-47` - `expect(prismaMember/prismaUser).toHaveBeenCalledTimes(1)`; `expect(adminMember/adminUser).not.toHaveBeenCalled()`. Sensor M1 (lib switched to `prismaAdmin`) makes all 3 tests fail with `expected "spy" to be called 1 times, but got 0 times` (`workspace-queries.spec.ts:34`)    | ✅ PASS |
| MR-14 | middleware imports / no `prisma.member.` or `prisma.user.`                                   | `grep -rnE 'prisma(Admin)?\.(member\|user)\.\|@repo/db' apps/server/src/middlewares --include='*.ts'` (non-test) → only `tenant-middleware.ts:2 import { createTenantClient } from '@repo/db'`                                                                                                                                                                     | ✅ PASS |
| MR-15 | 3 middleware specs byte-identical and passing                                                | `git diff f5d957cb 87510833 -- …/tenant-middleware.spec.ts …/require-super-admin-2fa.spec.ts` → 0 bytes; `git diff 1c75c0fc 87510833 -- …/auth-middleware.spec.ts` → 0 bytes. At 87510833: tenant 7, auth 6, 2FA 6 tests passed (`tenant-middleware.spec.ts:84-91`, `require-super-admin-2fa.spec.ts:107-110` still pin the exact Prisma call args)                | ✅ PASS |
| MR-16 | `container-registrations.ts` unchanged                                                       | `git diff f5d957cb 87510833 -- apps/server/src/container-registrations.ts` → 0 bytes                                                                                                                                                                                                                                                                               | ✅ PASS |
| MR-17 | 4 root gates exit 0; server ≥116 files, core ≥104 files, 0 failed                            | `pnpm lint --force` exit 0 (16/16 tasks); `pnpm typecheck --force` exit 0 (16/16); `pnpm build --force` exit 0 (6/6); `pnpm turbo test --force` exit 0 (12/12). `@app/server` 116 files / 649 tests; `@repo/core` 104 / 587; `@repo/auth` 3 / 47                                                                                                                   | ✅ PASS |

**Status**: ✅ All 17 ACs covered with spec-anchored assertions.

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/wt-sensor 87510833`, then `pnpm install --offline`. Each mutant ran the 4 server specs (auth, tenant, 2FA middleware, workspace-queries) and the 2 core specs, then was reverted with `git checkout`. Unmutated baseline: server 4 files / 22 tests, core 2 / 12, all passing. Sensor depth: P0-full (auth/RLS path, 14 manual mutations).

| #   | File:line                                    | Mutation                                              | Killed?                    | Killing spec(s)                                                              |
| --- | -------------------------------------------- | ----------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| M1  | `apps/server/src/lib/workspace-queries.ts:2` | `prisma` → `prismaAdmin as prisma`                    | ✅ Killed                  | workspace-queries (+ the 3 middleware specs, whose mocks lack `prismaAdmin`) |
| M2  | `resolve-membership.ts:23-24`                | swap `userId` / `organizationId`                      | ✅ Killed                  | resolve-membership, tenant-middleware                                        |
| M3  | `resolve-membership.ts:28`                   | `active: true` always                                 | ✅ Killed                  | resolve-membership, tenant-middleware                                        |
| M4  | `get-user-status.ts:13`                      | `return Boolean(user)`                                | ✅ Killed                  | get-user-status, auth-middleware                                             |
| M5  | `get-user-status.ts:21`                      | `twoFactorEnabled !== false`                          | ✅ Killed                  | get-user-status, require-super-admin-2fa                                     |
| M6  | `tenant-middleware.ts:29`                    | drop `!member.active`                                 | ✅ Killed                  | tenant-middleware                                                            |
| M7  | `auth-middleware.ts:16`                      | `value.join(', ')` → `value[0]`                       | ✅ Killed                  | auth-middleware                                                              |
| M8  | `auth-middleware.ts:36`                      | `isSuperAdmin: false`                                 | ✅ Killed                  | auth-middleware                                                              |
| M9  | `require-super-admin-2fa.ts:29`              | invert `!twoFactorEnabled`                            | ✅ Killed                  | require-super-admin-2fa                                                      |
| M10 | `resolve-membership.ts:28`                   | `role: 'OWNER'` hardcoded                             | ✅ Killed                  | resolve-membership, tenant-middleware                                        |
| M11 | `get-user-status.ts:11`                      | select adds `twoFactorEnabled: true`                  | ✅ Killed                  | get-user-status, auth-middleware                                             |
| M12 | `auth-middleware.ts:29`                      | calls `hasTwoFactorEnabled` instead of `isSuperAdmin` | ✅ Killed                  | auth-middleware                                                              |
| M13 | `tenant-middleware.ts:34`                    | FORBIDDEN message → `'Forbidden'`                     | ❌ Survived (outside diff) | none                                                                         |
| M14 | `require-super-admin-2fa.ts:35`              | TWO_FACTOR_REQUIRED message → `'2FA required'`        | ❌ Survived (outside diff) | none                                                                         |

**Result**: 12/12 mutants on the diff surface killed. The 2 probe mutants on unchanged lines survived (L-002 check).

M13 and M14 target error `message` strings on lines this range did not touch (the diff removes and adds only the lookup lines). The unchanged tenant and 2FA specs assert `expect.objectContaining({ code })` only (`tenant-middleware.spec.ts:93-98`, `require-super-admin-2fa.spec.ts:83-87`), so a message change would go unnoticed. The move cannot have altered these strings (verified by the diff above), so they do not block this feature. They are recorded as a follow-up because MR-15 uses those specs as the proof of "identical middleware behavior". Isolation: both worktrees removed with `git worktree remove --force`; the real tree's `git status --porcelain` was empty before and after.

---

## Scope check (L-003)

`grep -rnE '\.(member|user)\.(find|count|aggregate)'` over `apps/server/src` (non-test, outside `routes/`) finds nothing. Middlewares, hooks, plugins, services and lib are clean. Remaining reads are either declared out of scope or in other apps:

- Routes (declared out of scope): `routes/v1/commissions/reject-commission.ts:52`, `routes/v1/commissions/approve-admin.ts:45`, `routes/terms/accept-terms.ts:37`. Also `routes/terms/get-terms-status.ts:19` and `routes/v1/proposals/send-quote.ts:108`, which the Out-of-Scope table does not name (spec-precision note: it lists `internal/leads/create-lead.ts`, which has no match for this pattern).
- `apps/chat-server/src/infra/socket/membership-validator.ts:53` - `prisma.member.findUnique` in a socket membership validator. This is the same kind of lookup in a middleware-like position, but in a different app. The spec's Problem Statement and Goals are scoped to `apps/server/src/middlewares`, so it is informational.
- `apps/worker/src/processors/alerts/check-*.ts` - `prismaAdmin.member.findMany` in batch jobs, not request middlewares.

## Code Quality

| Principle                                                                                                                                                                                             | Status |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Minimum code (6-line lib, 2 small query classes)                                                                                                                                                      | ✅     |
| Surgical changes (only lookup lines in 3 middlewares)                                                                                                                                                 | ✅     |
| No scope creep (no DI registration, container unchanged)                                                                                                                                              | ✅     |
| Matches patterns (core module under `workspace/members/application`)                                                                                                                                  | ✅     |
| Spec-anchored outcome check                                                                                                                                                                           | ✅     |
| Per-layer coverage (query 1:1 ACs; middleware branches via unchanged specs)                                                                                                                           | ✅     |
| Every new test maps to an AC (auth spec → MR-01..05; core specs → MR-07..09; lib spec → MR-13)                                                                                                        | ✅     |
| CLAUDE.md prohibitions in non-test changed files: no `any` (only the word in a comment at `require-super-admin-2fa.ts:7`), no `as`, no eslint-disable, no `@ts-*`, no `console.log`, no `process.env` | ✅     |

`as unknown as` appears only in test mocks (`resolve-membership.spec.ts:5`, `get-user-status.spec.ts:5`, `auth-middleware.spec.ts:20,52-53`). That use is allowed.

---

## Edge Cases

- [x] Member row `active: false` → 403 FORBIDDEN: `tenant-middleware.spec.ts:100-117`, passing unchanged; mutants M3 and M6 killed.
- [x] User row deleted mid-session → 403 TWO_FACTOR_REQUIRED: `require-super-admin-2fa.spec.ts:75-88`, passing unchanged.
- [x] `request.role` typed as `Role` without `as`: `resolve-membership.ts:1,11` (`role: Role`), `tenant-middleware.ts:39` `request.role = member.role`; `pnpm typecheck --force` exit 0.

---

## Gate Check

- **Gate commands**: `pnpm lint --force`, `pnpm typecheck --force`, `pnpm build --force`, `pnpm turbo test --force` (repo root)
- **Result**: all exit 0. The test gate passed 12/12 tasks with 0 failed and 0 skipped.
- **Test count before feature**: `@app/server` 114 / 640; `@repo/core` 102 / 575
- **Test count after feature**: `@app/server` 116 / 649; `@repo/core` 104 / 587
- **Delta**: server +2 files / +9 tests (auth-middleware 6, workspace-queries 3); core +2 files / +12 tests (resolve-membership 3, get-user-status 9). No tests were deleted, and no existing spec changed.
- **Other packages**: auth 3/47, shared 6/82, web 47/329, chat-server 10/61, worker 4/23, chat-worker 2/7, ai 2/9, aggilizador 4/15, asaas-adapter 6/45, billing-port 2/16.

---

## Fix Plans (non-blocking follow-ups)

### Follow-up 1: tenant and 2FA middleware specs do not pin error messages

- **Root cause**: `tenant-middleware.spec.ts:42-47,54-59,69-74,93-98,112-117` and `require-super-admin-2fa.spec.ts:37-41,52-56,68-72,83-87` use `expect.objectContaining({ code })`. Mutants M13 and M14 survived.
- **Fix task**: in a later step, not this feature (MR-15 requires these files byte-identical), assert the full `{ success: false, error: { code, message } }` body for each 400/401/403 branch.
- **Priority**: Minor

### Follow-up 2: out-of-scope list is incomplete

- **Root cause**: `routes/terms/get-terms-status.ts:19` and `routes/v1/proposals/send-quote.ts:108` read `prisma.user` but are not named in the spec's Out-of-Scope table. `apps/chat-server/src/infra/socket/membership-validator.ts:53` performs the same membership lookup outside `apps/server`.
- **Fix task**: add them to the plan's Step 2.3+ inventory.
- **Priority**: Minor

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 17/17 ACs matched spec outcome, 0 spec-precision gaps blocking
**Sensor**: 12/12 diff-surface mutants killed. 2 probe mutants on unchanged message lines survived (non-blocking).
**Gate**: lint, typecheck, build and test all exit 0; server 116/649, core 104/587, 0 failed

**What works**: the lookups run on non-admin `prisma` (proven by spec and mutant M1). Middleware behavior matches, including 2FA null/undefined coercion. The characterization spec was proven on the pre-move code in an isolated worktree.

**Issues found**: Follow-ups 1 and 2 above (Minor, non-blocking).

**Next steps**: set MR-01..MR-17 to Verified (orchestrator); schedule Follow-up 1 with the next middleware change.
