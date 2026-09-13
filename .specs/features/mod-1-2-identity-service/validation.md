# mod-1-2-identity-service Validation

**Date**: 2026-09-13
**Spec**: `.specs/features/mod-1-2-identity-service/spec.md`
**Diff range**: `bcedb31f..5eccf37b` (98ecdfe1, df335e10, b85f09fe, a0b6b9e4, 4f9ad3c5, 5eccf37b)
**Verifier**: independent sub-agent (author ≠ verifier), re-verification iteration 2 of 3

**Verdict**: PASS

The iteration-1 gap is closed. Mutant M14 and the new M14b are both killed by `@repo/auth` vitest. ID-19 now states both pt-BR messages, and they match the spec text, the unit assertions and `identity-service.ts` byte for byte. All 25 ACs have evidence, the killed mutants re-run as regression checks are still killed, and all 4 forced gates exit 0 with the expected counts.

---

## Iteration History

| Iter | Range                | Verdict | Notes                                                                                                                                                                               |
| ---- | -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `bcedb31f..4f9ad3c5` | FAIL    | 25/25 ACs evidenced, 15/16 mutants killed. M14 survived because no test asserted `error.message` for `NO_SESSION` / `SESSION_EMAIL_MISMATCH`, and ID-19 did not state the messages. |
| 2    | `bcedb31f..5eccf37b` | PASS    | Fix 5eccf37b is test and spec only. M14 and M14b killed; M1, M5 and M6 re-run and still killed. Gates green.                                                                        |

### Fix commit scope (5eccf37b)

`git show --stat 5eccf37b` lists 4 files, 59 insertions, 4 deletions:

- `.specs/LESSONS.md` (+14)
- `.specs/features/mod-1-2-identity-service/spec.md` (1 line, ID-19)
- `.specs/lessons.json` (+33/-1)
- `packages/auth/src/identity-service.spec.ts` (+11/-2)

**No production code changed.** `identity-service.ts`, the route handlers and the route specs are untouched, so ID-23 (route specs byte-identical) still holds.

---

## Task Completion

No `tasks.md` exists for this feature (only `spec.md`).

| Commit   | Content                                                                                            | Status  |
| -------- | -------------------------------------------------------------------------------------------------- | ------- |
| 98ecdfe1 | Characterization specs: accept-invitation + onboarding                                             | ✅ Done |
| df335e10 | `packages/auth/src/identity-service.ts` + spec + `./identity` export                               | ✅ Done |
| b85f09fe | Characterization spec: get-public-invitation currentSession (spec scope corrected)                 | ✅ Done |
| a0b6b9e4 | accept-invitation + get-public-invitation use service; helpers deleted; `_origin-headers.ts`       | ✅ Done |
| 4f9ad3c5 | onboarding `complete.ts` uses service                                                              | ✅ Done |
| 5eccf37b | Iteration-1 fix: NO_SESSION / SESSION_EMAIL_MISMATCH message assertions; ID-19 states the messages | ✅ Done |

---

## Behavior Parity (deleted helpers at bcedb31f vs service)

Carried forward from iteration 1. `identity-service.ts` is unchanged in 5eccf37b, so every line citation below still holds.

- **Branches, status codes, error codes, pt-BR messages, log calls:** every string literal from `_better-auth-helpers.ts` and `_invitation-auth.ts` at bcedb31f appears in `packages/auth/src/identity-service.ts`.
  - Only `'cookie'`, `'origin'` and `'http://localhost:3000'` moved, to `apps/server/src/routes/v1/invitations/_origin-headers.ts:7-10`.
  - The additions are the type-guard literals and the `InvitationAuthMode` discriminants.
- **Control flow matches statement for statement:**
  - signIn `:117-136`
  - signUp `:138-170`: `prisma.user.update` at `:159` runs before `signInExisting` at `:163`
  - applyActiveOrg `:172-190`
  - readCurrentSession `:192-204`
  - authenticateForInvitation `:206-243`: strict `!==` at `:235`
- **`returnHeaders: true`** is kept on signInEmail (`:123`), signUpEmail (`:145`) and setActiveOrganization (`:180`). getSession (`:197`) and createOrganization (`:249-252`) get none, same as before.
- **`extractAuthErrorCode` (`:67-78`), informational note:** the old `as` cast and the new type narrowing were compared over 23 input shapes (`scratchpad/parity.mjs`). They behave identically except in two cases:
  - A non-string truthy `code` (number, object).
  - A function-typed `response` / `error`.

  In those cases the old code returned the value, which fell through to the fallback error with no log. The new code returns `null`, then `result.response.user.id` throws a TypeError inside the same try. That maps to the same fallback (`422 REGISTRATION_FAILED` / `401 SIGN_IN_FAILED`) plus one extra `logger.error`. `code: 0` / `false` has the same truthiness, so behavior is unchanged. Better Auth types `code` as `string`, so the typed API cannot reach this. Not a gap.

- **Route handlers:** the diffs of `accept-invitation.ts`, `get-public-invitation.ts` and `complete.ts` change only three things:
  - imports;
  - `const identity = createIdentityService(auth)`;
  - the call targets, which now go through `identity`.

  Cookie order is unchanged: `accept-invitation.ts:100` auth cookies, then `:102` `authHeaders.set('cookie', …)`, then `:112` applyActiveOrg, then org cookies.

---

## Spec-Anchored Acceptance Criteria

### P1: Current behavior pinned before the move

| AC    | Spec-defined outcome                                                              | `file:line` + assertion                                                                                                                                                                      | Result  |
| ----- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| ID-01 | login → 200, set-cookie = [sign-in, active-org]                                   | `apps/server/src/routes/v1/invitations/__tests__/accept-invitation.spec.ts:326-330` - `expect(setCookiesOf(response.headers)).toEqual(['session=abc; Path=/; HttpOnly', ACTIVE_ORG_COOKIE])` | ✅ PASS |
| ID-02 | register → 200, set-cookie = [sign-in, active-org]                                | `accept-invitation.spec.ts:353-357` - `toEqual(['session=reg; Path=/', ACTIVE_ORG_COOKIE])`                                                                                                  | ✅ PASS |
| ID-03 | current-session → 200, only active-org cookie                                     | `accept-invitation.spec.ts:376-377` - `toEqual([ACTIVE_ORG_COOKIE])`                                                                                                                         | ✅ PASS |
| ID-04 | setActiveOrganization gets `{ organizationId }` + cookie joined by `; `           | `accept-invitation.spec.ts:394-399` - `toMatchObject({ body: { organizationId: 'org-id-001' } })`, `expect(forwardedCookie(call)).toBe('session=abc; Path=/; HttpOnly; csrf=xyz; Path=/')`   | ✅ PASS |
| ID-05 | setActiveOrganization throws → 200, success body, only auth cookies               | `accept-invitation.spec.ts:410-417` - `toEqual({ success: true, data: {...} })`, `toEqual(['session=abc; Path=/; HttpOnly'])`                                                                | ✅ PASS |
| ID-06 | InvitationExpiredError after register → 400 `INVITATION_EXPIRED` + sign-in cookie | `accept-invitation.spec.ts:439-442` - `toBe(400)`, `error.code).toBe('INVITATION_EXPIRED')`, `toEqual(['session=reg; Path=/'])`                                                              | ✅ PASS |
| ID-07 | createOrganization cookie header = request cookie                                 | `apps/server/src/routes/v1/onboarding/__tests__/complete.spec.ts:127-130` - `headers.get('cookie')).toBe('better-auth.session_token=tok-123')`                                               | ✅ PASS |
| ID-08 | Characterization specs pass on pre-move code                                      | Iteration 1, scratch worktree at `b85f09fe`: route code is byte-identical to `bcedb31f` and the 3 specs give **35/35 passed**. 5eccf37b does not touch these files.                          | ✅ PASS |

### P1: Identity service in `@repo/auth`

| AC    | Spec-defined outcome                                                                                                                                                                                                                                                   | `file:line` + assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Result                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| ID-09 | `@repo/auth/identity` exports createIdentityService, InviteAuthError, AuthResult, IdentityLogger, InvitationAuthMode                                                                                                                                                   | `packages/auth/package.json:13` - `"./identity": "./src/identity-service.ts"`; `identity-service.ts:4,10,21,26,116`; consumed at `accept-invitation.ts:2-6` (typecheck and build green)                                                                                                                                                                                                                                                                                                                                                                                                                                                   | ✅ PASS                                         |
| ID-10 | No `fastify` import                                                                                                                                                                                                                                                    | `identity-service.ts:1-2` imports only `@repo/db` and `./index.js`; `grep fastify` finds no match                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | ✅ PASS                                         |
| ID-11 | USER_ALREADY_EXISTS → 409 / EMAIL_ALREADY_EXISTS / `Este email já tem conta. Acesse o convite usando login.`                                                                                                                                                           | `packages/auth/src/identity-service.spec.ts:48-56` - `rejects.toBeInstanceOf(InviteAuthError)`, `toMatchObject({ statusCode: 409, code: 'EMAIL_ALREADY_EXISTS', message: … })`                                                                                                                                                                                                                                                                                                                                                                                                                                                            | ✅ PASS                                         |
| ID-12 | INVALID_PASSWORD / PASSWORD_TOO_SHORT → 422 / WEAK_PASSWORD / `Senha não atende aos requisitos mínimos.`                                                                                                                                                               | `identity-service.spec.ts:59-68` - `it.each` + `toMatchObject({ statusCode: 422, code: 'WEAK_PASSWORD', message })`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | ✅ PASS                                         |
| ID-13 | thrown error or other code → 422 / REGISTRATION_FAILED / `Falha ao criar conta. Tente novamente.`                                                                                                                                                                      | `identity-service.spec.ts:71-77` (unknown code), `:80-88` (thrown; `logger.error` ×1; no update)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | ✅ PASS                                         |
| ID-14 | update `{ where: { id }, data: { emailVerified: true } }` before signIn; returns `{ userId, cookies }` from sign-in                                                                                                                                                    | `identity-service.spec.ts:101` - `toHaveBeenCalledWith({ where: { id: 'user-new' }, data: { emailVerified: true } })`, `:108` - `expect(updateOrder).toBeLessThan(signInOrder ?? 0)`, `toEqual({ userId: 'user-new', cookies: ['session=abc; Path=/'] })`                                                                                                                                                                                                                                                                                                                                                                                 | ✅ PASS                                         |
| ID-15 | INVALID_PASSWORD / INVALID_CREDENTIALS → 401 / `Senha incorreta`; EMAIL_NOT_VERIFIED → 403 / `Email não verificado.`                                                                                                                                                   | `identity-service.spec.ts:124-134`, `:136-142`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | ✅ PASS                                         |
| ID-16 | thrown error or other code → 401 / SIGN_IN_FAILED / `Falha ao autenticar`                                                                                                                                                                                              | `identity-service.spec.ts:145-151`, `:154-160`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | ✅ PASS                                         |
| ID-17 | setActiveOrganization throws → `[]` + `logger.warn` once                                                                                                                                                                                                               | `identity-service.spec.ts:179-187` - `toEqual([])`, `logger.warn).toHaveBeenCalledTimes(1)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | ✅ PASS                                         |
| ID-18 | getSession throws or no user → `null`                                                                                                                                                                                                                                  | `identity-service.spec.ts:209-211`, `:214-216` - `toBeNull()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | ✅ PASS                                         |
| ID-19 | no session → 401 / `NO_SESSION` / `Você não está autenticado. Faça login pra aceitar o convite.`; `!==` mismatch → 403 / `SESSION_EMAIL_MISMATCH` / `Você está logado com outro email. Saia da sessão atual pra aceitar este convite.`; else `{ userId, cookies: [] }` | `identity-service.spec.ts:233-247` - `rejects.toMatchObject({ statusCode: 401, code: 'NO_SESSION', message: 'Você não está autenticado. Faça login pra aceitar o convite.' })`; `:249-266` (different-case email) - `rejects.toMatchObject({ statusCode: 403, code: 'SESSION_EMAIL_MISMATCH', message: 'Você está logado com outro email. Saia da sessão atual pra aceitar este convite.' })`; `:278` - `toEqual({ userId: 'user-3', cookies: [] })`. **Byte check:** Python `bytes.count` gives each message (64 and 83 UTF-8 bytes) exactly once in `identity-service.ts:232,239`, `identity-service.spec.ts:245,264` and `spec.md:87`. | ✅ PASS (iteration-1 spec-precision gap closed) |
| ID-20 | `createOrganization({ body: { name, slug, userId }, headers })`, returns `{ id }`                                                                                                                                                                                      | `identity-service.spec.ts:309` - `toHaveBeenCalledWith({ body: {...}, headers })`, `:317` - `toEqual({ id: 'org-new' })`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ✅ PASS                                         |

### P1: Routes only translate

| AC    | Spec-defined outcome                                                   | Evidence                                                                                                                                                                                                                          | Result  |
| ----- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| ID-21 | helpers deleted; get-public-invitation uses service                    | `_better-auth-helpers.ts` and `_invitation-auth.ts` are absent from `apps/server/src/routes/v1/invitations/`; `get-public-invitation.ts:1` imports `createIdentityService`; pinned by `get-public-invitation.spec.ts:104-115,125` | ✅ PASS |
| ID-22 | zero `auth.api.` and zero `@repo/db` in non-test files of both folders | `grep -rn -e 'auth\.api\.' -e '@repo/db' apps/server/src/routes/v1/{invitations,onboarding}` with `__tests__` excluded returns nothing. 5eccf37b does not touch `apps/`.                                                          | ✅ PASS |
| ID-23 | the 3 route specs byte-identical after characterization, and passing   | `git diff 98ecdfe1 5eccf37b` on accept-invitation and complete specs is empty; `git diff b85f09fe 5eccf37b` on get-public-invitation spec is empty. They pass in the iteration-2 gate (server 114/640).                           | ✅ PASS |
| ID-24 | `_schemas.ts` ×2 and route `schema` blocks unchanged                   | `git diff --stat bcedb31f 5eccf37b` on both `_schemas.ts` is empty; no route hunk falls inside `schema:` (e.g. `accept-invitation.ts:45-60`)                                                                                      | ✅ PASS |
| ID-25 | 4 gates exit 0; server ≥ 114/631 + new; auth ≥ 3 files                 | Iteration-2 Gate Check: lint 0, typecheck 0, build 0, test 0; server 114/640, auth 3/47                                                                                                                                           | ✅ PASS |

**Status**: ✅ All 25 ACs covered with evidence; 0 spec-precision gaps.

---

## Discrimination Sensor

### Iteration 2 run

- **Scratch:** `git worktree add --detach <scratchpad>/wt-i2 5eccf37b`, set up with `pnpm install --offline --frozen-lockfile --filter "@app/server..." --filter "@repo/auth..."` (exit 0) and a copy of the gitignored `packages/db/generated/client`.
- **Runner:** `scratchpad/mutate-i2.py`. Each mutant is applied alone after `git checkout -- .`, then two suites run:
  - `apps/server` vitest on accept-invitation, get-public-invitation and complete specs;
  - `packages/auth` vitest on `identity-service.spec.ts`.
- **Baseline (unmutated):** server 3 files 35/35, auth 1 file 22/22.

| #               | File:line                                                        | Mutation                                                       | Killed?                                                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M14             | `packages/auth/src/identity-service.ts:232`                      | NO_SESSION message changed to `'Sem sessão.'`                  | ✅ Killed. auth rc=1: `× authenticateForInvitation > current-session without session throws 401 NO_SESSION` (`identity-service.spec.ts:233`). Server rc=0, as expected: route specs do not assert the message. |
| M14b            | `packages/auth/src/identity-service.ts:239`                      | SESSION_EMAIL_MISMATCH message changed to `'Email diferente.'` | ✅ Killed. auth rc=1: `× authenticateForInvitation > current-session with a different-case email throws 403 SESSION_EMAIL_MISMATCH` (`identity-service.spec.ts:249`).                                          |
| M1 (regression) | `apps/server/src/routes/v1/invitations/accept-invitation.ts:100` | Auth cookies applied after org cookies                         | ✅ Killed. server rc=1: login, register and expired-invitation cookie-order tests.                                                                                                                             |
| M5 (regression) | `identity-service.ts:235`                                        | Case-insensitive email compare                                 | ✅ Killed. auth rc=1: SESSION_EMAIL_MISMATCH test (`:249`).                                                                                                                                                    |
| M6 (regression) | `identity-service.ts:159-162`                                    | Removed `prisma.user.update`                                   | ✅ Killed. server rc=1 (register mode) and auth rc=1 (`signUpAndSignIn > marks email verified…`).                                                                                                              |

The worktree was clean after the final reset. `git worktree remove --force` then `git worktree prune` were run. Real-tree `git status --porcelain` before the sensor was `?? .specs/features/mod-1-2-identity-service/validation.md`; after removal it was identical (`diff` empty).

### Iteration 1 run (carried forward; production code is unchanged since 4f9ad3c5)

| #   | File:line                      | Mutation                                 | Killed?                                                                                |
| --- | ------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| M1  | `accept-invitation.ts:100,117` | Auth cookies after org cookies           | ✅ Killed                                                                              |
| M2  | `accept-invitation.ts:102`     | Removed `authHeaders.set('cookie', …)`   | ✅ Killed                                                                              |
| M3  | `identity-service.ts:188`      | applyActiveOrg rethrows                  | ✅ Killed                                                                              |
| M4  | `identity-service.ts:123`      | Dropped `returnHeaders` from signInEmail | ✅ Killed                                                                              |
| M5  | `identity-service.ts:235`      | Case-insensitive compare                 | ✅ Killed                                                                              |
| M6  | `identity-service.ts:159-162`  | Removed `prisma.user.update`             | ✅ Killed                                                                              |
| M7  | `identity-service.ts:83`       | 409 → 422                                | ✅ Killed                                                                              |
| M8  | `identity-service.ts:251`      | `new Headers()` to createOrganization    | ✅ Killed                                                                              |
| M9  | `identity-service.ts:104`      | `'Senha incorreta'` changed              | ✅ Killed                                                                              |
| M10 | `identity-service.ts:201-202`  | readCurrentSession rethrows              | ✅ Killed                                                                              |
| M11 | `identity-service.ts:145`      | Dropped `returnHeaders` from signUpEmail | ✅ Killed by typecheck gate (TS2339); survives vitest because the mocks return headers |
| M12 | `identity-service.ts:159,163`  | update after signIn                      | ✅ Killed                                                                              |
| M13 | `identity-service.ts:77`       | extractAuthErrorCode → `null`            | ✅ Killed                                                                              |
| M14 | `identity-service.ts:232`      | NO_SESSION message                       | ❌ Survived in iter 1 → ✅ Killed in iter 2                                            |
| M15 | `identity-service.ts:184-187`  | Removed `logger.warn`                    | ✅ Killed                                                                              |
| M16 | `identity-service.ts:253`      | returns `{ id: slug }`                   | ✅ Killed                                                                              |

**Sensor depth**: P0 (auth / session cookies). 17 distinct mutants: the 16 from iteration 1 plus M14b.
**Result**: 17/17 killed (16 by tests, M11 by the typecheck gate), 0 survivors. **PASS ✅**

---

## Code Quality

| Principle                                                         | Status                                                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Minimum code                                                      | ✅ Service is a straight relocation plus `createOrganizationForUser`; the fix is 2 assertions                            |
| Surgical changes                                                  | ✅ 5eccf37b touches only the unit spec, ID-19 and the lessons files                                                      |
| No scope creep                                                    | ✅                                                                                                                       |
| Matches patterns                                                  | ✅                                                                                                                       |
| CLAUDE.md prohibitions in non-test changed files                  | ✅ No `any`, `as`, `eslint-disable`, `ts-ignore`, `console.*` or `process.env` introduced (test mocks use allowed casts) |
| Spec-anchored outcome check                                       | ✅ Asserted values equal the spec text, including the ID-19 messages (byte-checked)                                      |
| Per-layer coverage (service 1:1 ACs; routes happy + edge + error) | ✅                                                                                                                       |
| Every test maps to a spec requirement                             | ✅                                                                                                                       |
| Documented guidelines followed                                    | ✅ `CLAUDE.md`                                                                                                           |

---

## Edge Cases

- [x] Register succeeds but signIn fails → 401 `SIGN_IN_FAILED`, no rollback (`identity-service.ts:159-169`; ID-16 `identity-service.spec.ts:145-160`).
- [x] No `origin` header falls back to `referer`, then `http://localhost:3000` (`_origin-headers.ts:7-10`, byte-identical to the deleted helper).
- [x] `@repo/auth/identity` bundled by tsup in `apps/server`: `pnpm build --force` exit 0.
- [x] `extractAuthErrorCode` with non-string / function-typed inputs: informational divergence only (see Behavior Parity), unreachable with the typed Better Auth API.

---

## Gate Check

Iteration 2, run from the repo root at 5eccf37b, with no cache.

| Gate                      | Exit | Turbo tasks                |
| ------------------------- | ---- | -------------------------- |
| `pnpm lint --force`       | 0    | 16/16 successful, 0 cached |
| `pnpm typecheck --force`  | 0    | 16/16, 0 cached            |
| `pnpm build --force`      | 0    | 6/6, 0 cached              |
| `pnpm turbo test --force` | 0    | 12/12, 0 cached            |

**Test counts (files / tests):**

| Package             | Files / tests |
| ------------------- | ------------- |
| @app/server         | 114 / 640     |
| @repo/auth          | 3 / 47        |
| @repo/core          | 102 / 575     |
| @app/web            | 47 / 329      |
| @repo/shared        | 6 / 82        |
| @app/chat-server    | 10 / 61       |
| @repo/asaas-adapter | 6 / 45        |
| @app/worker         | 4 / 23        |
| @repo/billing-port  | 2 / 16        |
| @repo/aggilizador   | 4 / 15        |
| @repo/ai            | 2 / 9         |
| @app/chat-worker    | 2 / 7         |

- **Before the feature** (bcedb31f): server 114/631, auth 2/25.
- **After:** server 114/640 (+9), auth 3/47 (+1 file / +22 tests).
- 5eccf37b adds no tests; it strengthens 2 existing assertions. No tests were deleted and no assertions were weakened.
- **Skipped**: none. **Failures**: none. The Pino error lines in the log come from intentional error-path tests.

---

## Fix Plans

None. Iteration-1 Fix 1 (pin the NO_SESSION / SESSION_EMAIL_MISMATCH messages) was applied in 5eccf37b and verified by M14/M14b.

---

## Requirement Traceability Update

Not applied by the Verifier (spec statuses are the orchestrator's to update). Recommended: ID-01..ID-25 → ✅ Verified.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 25/25 ACs matched the spec outcome; 0 spec-precision gaps
**Sensor**: 17/17 mutants killed (M14 and M14b now killed; M1, M5 and M6 re-run and still killed)
**Gate**: lint, typecheck, build and test exit 0; server 114/640, auth 3/47, core 102/575

**What works**:

- Cookie sequence on invite accept is pinned and was proven on pre-move code.
- The service is a faithful relocation.
- The routes only translate.
- The session error messages are now pinned by the spec and the tests.

**Issues found**: none.

**Next steps**: mark ID-01..ID-25 Verified. No new lessons: clean PASS with no new grounded failure (L-002/L-003 already record the iteration-1 signal).
