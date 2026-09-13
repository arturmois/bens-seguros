# MOD-1 Step 1.2 — Move Better Auth orchestration into `@repo/auth` Specification

## Problem Statement

Server routes talk to Better Auth directly and write identity tables: `apps/server/src/routes/v1/invitations/_better-auth-helpers.ts` calls `auth.api.signUpEmail`, `signInEmail`, `setActiveOrganization`, `getSession` and runs `prisma.user.update`; `_invitation-auth.ts` holds the register/login/current-session dispatch and the session-email check; `onboarding/complete.ts` calls `auth.api.createOrganization`. Step 1.2 of `docs/architecture/2026-09-13-migration-plan.md` makes `@repo/auth` the only place that touches Better Auth, so routes only translate Fastify ↔ service. It is the highest-risk step of Phase 1: a cookie/header forwarding difference breaks the session after invite acceptance.

Baseline at `bcedb31f`: `@app/server` 114 files / 631 tests; `@repo/auth` 2 files / 25 tests.

## Goals

- [ ] Zero `auth.api.*` calls and zero `prisma.user.*` writes in `apps/server/src/routes/v1/{invitations,onboarding}/**`.
- [ ] Byte-identical HTTP behavior for `POST /api/v1/invitations/:id/accept` and `POST /api/v1/onboarding/complete` (status, body, `set-cookie` headers), proven by route specs written before the move and left unmodified by it.

## Out of Scope

| Feature                                                    | Reason                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `middlewares/auth-middleware.ts` `auth.api.getSession`     | Not listed in plan Step 1.2; middleware is Step 1.3                           |
| `routes/terms/accept-terms.ts` `prisma.user.update`        | Not an invitation/onboarding path; not listed in Step 1.2                     |
| Case-insensitive email match in current-session mode       | Behavior change (usability bug); separate ticket                              |
| Member role hierarchy (`<` vs `<=`)                        | Logged as out-of-scope ticket in the plan                                     |
| `slugify` and `CreateOrgWithTrial` wiring in `complete.ts` | Organization naming is not identity; only the `createOrganization` call moves |
| Smoke flows via Playwright                                 | Plan runs smoke flows on the phase's last PR (Step 1.4)                       |

---

## Assumptions & Open Questions

| Assumption / decision                         | Chosen default                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Rationale                                                                                                                           | Confirmed? |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Service shape                                 | `packages/auth/src/identity-service.ts` exporting `createIdentityService(auth: Auth)` that returns `{ signUpAndSignIn, signInExisting, applyActiveOrg, readCurrentSession, authenticateForInvitation, createOrganizationForUser }`; exported as `@repo/auth/identity`                                                                                                                                                                                                                   | Routes keep receiving the same injected `Auth`, so existing route specs (which stub `auth.api`) exercise the real service unchanged | n          |
| Function names                                | Keep today's names (`signUpAndSignIn`, `signInExisting`, `applyActiveOrg`, `readCurrentSession`, `authenticateForInvitation`, `InviteAuthError`, `AuthResult`); only `createOrganizationForUser` is new. The plan's `setActiveOrganization` / `readSession` names are not adopted                                                                                                                                                                                                       | Plan §0 "a step that relocates logic doesn't also rename"                                                                           | n          |
| Framework independence                        | Service takes `Headers` and an `IdentityLogger` interface (`error`, `warn`, `debug` with `(obj, msg)`), which Fastify's logger satisfies structurally; no `fastify` import in `@repo/auth`                                                                                                                                                                                                                                                                                              | Plan: framework-agnostic service                                                                                                    | n          |
| `buildOriginHeaders`                          | Stays in the server as a route-side helper (Fastify request → `Headers`), moved to `routes/v1/invitations/_origin-headers.ts`; `_better-auth-helpers.ts` and `_invitation-auth.ts` are deleted                                                                                                                                                                                                                                                                                          | It is Fastify ↔ service translation                                                                                                 | n          |
| Request body type                             | `authenticateForInvitation` takes an `InvitationAuthMode` discriminated union declared in `@repo/auth` (`register` with `password`+`name`, `login` with `password`, `current-session`); the Zod schema in `_schemas.ts` is unchanged and its parsed type is assignable to it                                                                                                                                                                                                            | `@repo/auth` must not import server schemas                                                                                         | n          |
| `prisma.user.update({ emailVerified: true })` | Moves into `signUpAndSignIn` in `@repo/auth` using `prisma` from `@repo/db` (already a dependency)                                                                                                                                                                                                                                                                                                                                                                                      | Plan Step 1.2 target state                                                                                                          | n          |
| Characterization gaps to close first          | Accept route: `set-cookie` values for login, register and current-session; active-org cookie appended after auth cookies; `setActiveOrganization` receives the auth cookies in its `cookie` header; `setActiveOrganization` failure → still 200; expired invitation (`AcceptInvitation` throws `InvitationExpiredError`) → 400 `INVITATION_EXPIRED` **with** the auth `set-cookie` already on the response. Onboarding route: `createOrganization` receives the request `cookie` header | These are the plan's named risks; existing specs assert statuses but not cookies                                                    | n          |
| Route specs during the move                   | The route spec files are not modified by the move commits (only by the characterization commit)                                                                                                                                                                                                                                                                                                                                                                                         | Unmodified specs passing is the no-behavior-change proof                                                                            | n          |
| OpenAPI contract check                        | Contract proven by zero diff in `routes/v1/{invitations,onboarding}/_schemas.ts` and route `schema` blocks; `generate:api` run only if the server can start locally, noted in validation                                                                                                                                                                                                                                                                                                | `generate:api` needs a running server + DB                                                                                          | n          |
| Delivery                                      | 4 commits: (1) characterization route specs, (2) identity service + unit specs, (3) accept-invitation route uses service, (4) onboarding route uses service                                                                                                                                                                                                                                                                                                                             | Each commit green and revertable                                                                                                    | n          |

**Open questions:** none — all logged above.

---

## User Stories

### P1: Current behavior pinned before the move ⭐ MVP

**User Story**: As the engineer moving auth code, I want route specs that pin status, body and cookies so that any forwarding difference fails a test.

**Why P1**: Plan requires characterization specs before moving logic.

**Acceptance Criteria**:

1. WHEN login mode succeeds THEN the accept route SHALL respond 200 with `set-cookie` containing the sign-in cookie followed by the active-organization cookie. <!-- ID-01 -->
2. WHEN register mode succeeds THEN the accept route SHALL respond 200 with `set-cookie` containing the sign-in cookie followed by the active-organization cookie. <!-- ID-02 -->
3. WHEN current-session mode succeeds THEN the accept route SHALL respond 200 with `set-cookie` containing only the active-organization cookie. <!-- ID-03 -->
4. WHEN authentication produced cookies THEN `auth.api.setActiveOrganization` SHALL receive `{ organizationId }` and a `cookie` header equal to those cookies joined by `; `. <!-- ID-04 -->
5. IF `auth.api.setActiveOrganization` throws THEN the accept route SHALL respond 200 with the success body and only the authentication cookies. <!-- ID-05 -->
6. IF `AcceptInvitation` throws `InvitationExpiredError` after register mode succeeded THEN the accept route SHALL respond 400 with `error.code` `INVITATION_EXPIRED` and SHALL include the sign-in `set-cookie`. <!-- ID-06 -->
7. WHEN onboarding completes THEN `auth.api.createOrganization` SHALL receive a `cookie` header equal to the request's `cookie` header. <!-- ID-07 -->
8. The characterization specs SHALL pass against the code at `bcedb31f` (before any move). <!-- ID-08 -->

**Independent Test**: Commit 1 changes only spec files; `pnpm --filter @app/server test` passes.

---

### P1: Identity service in `@repo/auth` ⭐ MVP

**User Story**: As a route author, I want one framework-agnostic identity service so that Better Auth is touched from a single package.

**Why P1**: Plan Step 1.2 target state.

**Acceptance Criteria**:

1. The module `@repo/auth/identity` SHALL export `createIdentityService`, `InviteAuthError`, and the types `AuthResult`, `IdentityLogger`, `InvitationAuthMode`. <!-- ID-09 -->
2. `packages/auth/src/identity-service.ts` SHALL NOT import `fastify`. <!-- ID-10 -->
3. WHEN `signUpEmail` returns error code `USER_ALREADY_EXISTS` THEN `signUpAndSignIn` SHALL throw `InviteAuthError` with status 409, code `EMAIL_ALREADY_EXISTS`, message `Este email já tem conta. Acesse o convite usando login.` <!-- ID-11 -->
4. WHEN `signUpEmail` returns `INVALID_PASSWORD` or `PASSWORD_TOO_SHORT` THEN `signUpAndSignIn` SHALL throw status 422, code `WEAK_PASSWORD`, message `Senha não atende aos requisitos mínimos.` <!-- ID-12 -->
5. IF `signUpEmail` throws a non-`InviteAuthError` or returns any other error code THEN `signUpAndSignIn` SHALL throw status 422, code `REGISTRATION_FAILED`, message `Falha ao criar conta. Tente novamente.` <!-- ID-13 -->
6. WHEN `signUpEmail` succeeds THEN `signUpAndSignIn` SHALL call `prisma.user.update({ where: { id: userId }, data: { emailVerified: true } })` before `signInEmail`, and SHALL return `{ userId, cookies }` with the sign-in `Set-Cookie` values. <!-- ID-14 -->
7. WHEN `signInEmail` returns `INVALID_PASSWORD` or `INVALID_CREDENTIALS` THEN `signInExisting` SHALL throw status 401, code `INVALID_CREDENTIALS`, message `Senha incorreta`; WHEN it returns `EMAIL_NOT_VERIFIED` THEN status 403, code `EMAIL_NOT_VERIFIED`, message `Email não verificado.` <!-- ID-15 -->
8. IF `signInEmail` throws or returns any other error code THEN `signInExisting` SHALL throw status 401, code `SIGN_IN_FAILED`, message `Falha ao autenticar`. <!-- ID-16 -->
9. IF `setActiveOrganization` throws THEN `applyActiveOrg` SHALL return `[]` and call `logger.warn` once. <!-- ID-17 -->
10. IF `getSession` throws or returns no user THEN `readCurrentSession` SHALL return `null`. <!-- ID-18 -->
11. WHILE mode is `current-session`, IF there is no session THEN `authenticateForInvitation` SHALL throw status 401, code `NO_SESSION`; IF the session email is not strictly equal (`!==`) to the invitation email THEN status 403, code `SESSION_EMAIL_MISMATCH`; otherwise it SHALL return `{ userId, cookies: [] }`. <!-- ID-19 -->
12. WHEN `createOrganizationForUser({ name, slug, userId, headers })` is called THEN it SHALL call `auth.api.createOrganization({ body: { name, slug, userId }, headers })` and return `{ id }` from the response. <!-- ID-20 -->

**Independent Test**: `pnpm --filter @repo/auth test` with a stubbed `auth.api` and mocked `@repo/db`.

---

### P1: Routes only translate ⭐ MVP

**User Story**: As a maintainer, I want the invitation and onboarding routes to hold no Better Auth calls or identity writes so that identity has one owner.

**Why P1**: Plan Step 1.2 expected outcome.

**Acceptance Criteria**:

1. The files `apps/server/src/routes/v1/invitations/_better-auth-helpers.ts` and `_invitation-auth.ts` SHALL NOT exist, and `get-public-invitation.ts` (which imports `readCurrentSession` from the helpers) SHALL use the identity service. <!-- ID-21 -->
2. Files under `apps/server/src/routes/v1/{invitations,onboarding}/` (excluding `__tests__`) SHALL contain zero `auth.api.` occurrences and zero `@repo/db` imports. <!-- ID-22 -->
3. WHEN the move commits are applied THEN `invitations/__tests__/accept-invitation.spec.ts` and `onboarding/__tests__/complete.spec.ts` and `invitations/__tests__/get-public-invitation.spec.ts` SHALL be byte-identical to their state after the characterization commit and SHALL pass. <!-- ID-23 -->
4. The files `_schemas.ts` in `invitations/` and `onboarding/`, and each route's `schema` block, SHALL be unchanged from `bcedb31f`. <!-- ID-24 -->
5. WHEN the 4 root gates run (`pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`) THEN each SHALL exit 0, with `@app/server` ≥ 114 files / 631 tests + the new characterization tests and `@repo/auth` ≥ 3 files. <!-- ID-25 -->

**Independent Test**: grep for `auth.api.` and `@repo/db` in the two route folders; `git diff` of the two spec files across the move commits is empty; gates.

---

## Edge Cases

- IF register mode's `signUpEmail` succeeds but `signInEmail` fails THEN the route SHALL keep today's behavior: 401 `SIGN_IN_FAILED`, user row already marked `emailVerified` (covered by ID-16 at service level; no rollback added).
- WHEN the request has no `origin` header THEN the origin header forwarded to Better Auth SHALL fall back to `referer`, then `http://localhost:3000` (unchanged `buildOriginHeaders`).
- IF the identity service is imported from `apps/server` THEN tsup SHALL bundle it (existing `noExternal: ['@repo/auth']` prefix covers the subpath; `pnpm build` proves it).

---

## Requirement Traceability

| Requirement ID | Story                     | Phase   | Status       |
| -------------- | ------------------------- | ------- | ------------ |
| ID-01          | P1: Characterization      | Execute | Implementing |
| ID-02          | P1: Characterization      | Execute | Implementing |
| ID-03          | P1: Characterization      | Execute | Implementing |
| ID-04          | P1: Characterization      | Execute | Implementing |
| ID-05          | P1: Characterization      | Execute | Implementing |
| ID-06          | P1: Characterization      | Execute | Implementing |
| ID-07          | P1: Characterization      | Execute | Implementing |
| ID-08          | P1: Characterization      | Execute | Implementing |
| ID-09          | P1: Identity service      | Execute | Implementing |
| ID-10          | P1: Identity service      | Execute | Implementing |
| ID-11          | P1: Identity service      | Execute | Implementing |
| ID-12          | P1: Identity service      | Execute | Implementing |
| ID-13          | P1: Identity service      | Execute | Implementing |
| ID-14          | P1: Identity service      | Execute | Implementing |
| ID-15          | P1: Identity service      | Execute | Implementing |
| ID-16          | P1: Identity service      | Execute | Implementing |
| ID-17          | P1: Identity service      | Execute | Implementing |
| ID-18          | P1: Identity service      | Execute | Implementing |
| ID-19          | P1: Identity service      | Execute | Implementing |
| ID-20          | P1: Identity service      | Execute | Implementing |
| ID-21          | P1: Routes only translate | Execute | Implementing |
| ID-22          | P1: Routes only translate | Execute | Implementing |
| ID-23          | P1: Routes only translate | Execute | Implementing |
| ID-24          | P1: Routes only translate | Execute | Implementing |
| ID-25          | P1: Routes only translate | Execute | Implementing |

**Coverage:** 25 total, 25 mapped to execution steps, 0 unmapped.

---

## Success Criteria

- [ ] 5 quality gates green.
- [ ] Better Auth (`auth.api.*`) is called from `packages/auth` and `middlewares/auth-middleware.ts` only (the latter until Step 1.3).
