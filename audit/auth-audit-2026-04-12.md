# Auth & Authorization Security Audit

**Date:** 2026-04-12
**Project:** Bens Seguros — Multi-tenant SaaS ERP for Brazilian Insurance Brokers
**Stack:** Better Auth 1.0 + CASL 6.7 + Fastify 5 + Prisma 7 (RLS) + Next.js 16 + Socket.IO 4 + Redis 8

## Summary

| Severity | Count |
| -------- | ----- |
| CRITICAL | 3     |
| WARNING  | 29    |
| INFO     | 10    |
| PASS     | 67    |

---

## Findings

### CRITICAL

---

### [CRITICAL] AA-001: RLS enforcement uncertain — Prisma connection role not verified

- **Domain:** rls-tenant-isolation
- **File:** `packages/db/prisma/rls-policies.sql:114`
- **Issue:** `FORCE ROW LEVEL SECURITY` is applied to all 16 tables, but the vast majority of routes and all DI-injected repositories use the global `prisma` client without setting `app.current_tenant`. This creates a contradiction: either (a) the connection role IS the table owner and FORCE RLS is active, meaning most queries return zero rows and the app is broken, or (b) the connection role is a superuser that bypasses RLS entirely, making all policies ineffective.
- **Risk:** If scenario (a): application silently fails for all DI-based queries. If scenario (b): RLS provides zero actual protection — only application-level WHERE clauses prevent cross-tenant access.
- **Recommendation:** Verify the DB role with `SELECT current_user, usesuper FROM pg_user WHERE usename = current_user`. The standard pattern requires two roles: (1) a migration/owner role for schema changes, and (2) an application role subject to RLS. Add a startup health check: `SET app.current_tenant = 'test'; SELECT count(*) FROM "Client";` to verify RLS is active.
- **Reference:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

### [CRITICAL] AA-002: Audit logs route over-restricted — blocks ADMIN and MANAGER

- **Domain:** casl-rbac
- **File:** `apps/server/src/routes/v1/audit-logs/list-audit-logs.ts:19`
- **Issue:** Route uses `requireAbility('manage', 'all')` which only OWNER satisfies. However, ADMIN and MANAGER both have `can('read', 'AuditLog')` in CASL definitions (abilities.ts:62, :73). The frontend permission matrix also grants `audit:read` to OWNER, ADMIN, and MANAGER.
- **Risk:** ADMIN and MANAGER are blocked from viewing audit logs despite being granted that ability in both CASL and frontend permissions. Broken access model.
- **Recommendation:** Change to `requireAbility('read', 'AuditLog')` to match CASL ability definitions.
- **Reference:** https://casl.js.org/v6/en/guide/define-rules

---

### [CRITICAL] AA-003: COMMERCIAL role cannot perform commission approval step

- **Domain:** casl-rbac
- **File:** `packages/auth/src/abilities.ts:78-83`, `apps/server/src/routes/v1/commissions/approve-commercial.ts:21`
- **Issue:** The `approve-commercial` route requires `requireAbility('approve', 'Commission')`. The COMMERCIAL role is never granted `approve` on `Commission` — only ADMIN (line 59) and MANAGER (line 70) have it. This breaks the two-step approval workflow where COMMERCIAL approves first, then admin.
- **Risk:** The commission approval workflow is broken for COMMERCIAL users.
- **Recommendation:** Add `can('approve', 'Commission')` to COMMERCIAL role in abilities.ts, or clarify the business rule and rename the route accordingly.
- **Reference:** https://casl.js.org/v6/en/guide/define-rules

---

### WARNING

---

### [WARNING] AA-004: Worker processors access RLS-protected tables without tenant context

- **Domain:** rls-tenant-isolation
- **File:** `apps/worker/src/processors/csv-import-processor.ts:122`
- **Issue:** CSV import processor calls `prisma.client.createMany()`, `prisma.policy.findFirst()`, etc. on strict-RLS tables using the global prisma client. Alert processors similarly query `prisma.claim`, `prisma.commission`, etc. globally. These queries lack `app.current_tenant`.
- **Risk:** With FORCE RLS active, these queries return zero rows and worker processors silently fail. Without it, they bypass tenant isolation.
- **Recommendation:** Use `createTenantClient(organizationId)` in worker processors, or verify the worker's DB role is not subject to FORCE RLS and document this explicitly.
- **Reference:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

### [WARNING] AA-005: DI-injected repositories use global prisma, not tenantPrisma

- **Domain:** rls-tenant-isolation
- **File:** `apps/server/src/container-registrations.ts:112`
- **Issue:** `'PrismaClient'` is registered with `{ useValue: prisma }` (global client). All 14 Prisma repository implementations in `packages/core` inject this global client. Every use case queries without RLS tenant context.
- **Risk:** If any repository method has a bug omitting the `organizationId` filter, data from other tenants could leak. RLS would have caught this but is bypassed.
- **Recommendation:** This is a documented architectural decision (application-level WHERE is primary, RLS is defense-in-depth). Consider creating a per-request tenantPrisma via middleware and passing it to repositories for critical modules, or investigate Prisma `$extends` for lightweight RLS injection.
- **Reference:** https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security

---

### [WARNING] AA-006: generate-policy-pdf and send-quote bypass RLS

- **Domain:** rls-tenant-isolation
- **File:** `apps/server/src/routes/v1/policies/generate-policy-pdf.ts:168`
- **Issue:** `prisma.client.findFirst({ where: { id: policy.clientId, organizationId } })` queries the Client table (strict RLS) through the global prisma client. While `organizationId` is in the WHERE clause, RLS would return zero rows without `app.current_tenant`. Same pattern in `send-quote.ts:55`.
- **Risk:** If RLS is enforced for the Prisma connection role, these queries return null and PDF generation fails silently.
- **Recommendation:** Use `request.tenantPrisma!` for these queries, or verify the DB role is not subject to FORCE RLS.
- **Reference:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

### [WARNING] AA-007: Raw SQL in stats-helpers bypasses RLS

- **Domain:** rls-tenant-isolation
- **File:** `apps/server/src/routes/v1/stats/stats-helpers.ts:177`
- **Issue:** Two `$queryRaw` calls query Proposal, Policy, Member, and User tables via the global `prisma` client. Both include `WHERE organizationId = ${orgId}` but bypass RLS. Comment explains this is intentional for performance (19+ concurrent queries).
- **Risk:** If the `orgId` parameter were missing or corrupted, these raw queries have no RLS safety net.
- **Recommendation:** Add a runtime guard `if (!orgId) throw` at the top of `buildDashboardData` before queries execute.
- **Reference:** https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries

---

### [WARNING] AA-008: Email verification silently disabled without RESEND_API_KEY

- **Domain:** auth-config
- **File:** `packages/auth/src/index.ts:70`
- **Issue:** `requireEmailVerification: !!emailSenders` means if `RESEND_API_KEY` is not set (optional in env schema), email verification is disabled. Users can sign up with unverified email addresses.
- **Risk:** Account takeover via unverified email; attacker registers with victim's email and gains access to invitation-based org memberships.
- **Recommendation:** Make `RESEND_API_KEY` required in production, or always set `requireEmailVerification: true` and queue emails, or log a startup warning.
- **Reference:** https://www.better-auth.com/docs/authentication/email-password#require-email-verification

---

### [WARNING] AA-009: Cookie security attributes rely on Better Auth defaults

- **Domain:** auth-config
- **File:** `packages/auth/src/index.ts:105-111`
- **Issue:** `advanced.defaultCookieAttributes` only sets `domain` in production. `httpOnly: true`, `secure: true`, and `sameSite: 'lax'` are not explicitly configured, relying entirely on library defaults.
- **Risk:** A library update could change defaults, or a misconfigured `NODE_ENV` could serve non-secure cookies.
- **Recommendation:** Add explicit attributes: `{ httpOnly: true, secure: isProduction, sameSite: 'lax' as const, ... }`.
- **Reference:** https://www.better-auth.com/docs/concepts/cookies

---

### [WARNING] AA-010: .env.example ships with predictable ENCRYPTION_KEY

- **Domain:** auth-config
- **File:** `.env.example:67`
- **Issue:** Dev `.env.example` contains `ENCRYPTION_KEY=0123456789abcdef...` — a sequential hex pattern. Developers who copy to `.env` and accidentally deploy would have zero PII encryption.
- **Risk:** If this key reaches production, all PII encrypted with it (CPF, CNPJ) is trivially decryptable.
- **Recommendation:** Replace with a clearly invalid placeholder that fails hex validation, forcing generation of a real key.
- **Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html

---

### [WARNING] AA-011: Email verification resend endpoint not rate-limited

- **Domain:** auth-config
- **File:** `apps/server/src/middlewares/auth-rate-limit.ts:16-42`
- **Issue:** `AUTH_RATE_LIMIT_PATHS` only covers `/sign-in/email`, `/forget-password`, and `/sign-up/email`. The `/send-verification-email` endpoint is not explicitly rate-limited beyond global 100/min.
- **Risk:** Attacker can trigger excessive verification emails (email bombing) or brute-force verification tokens.
- **Recommendation:** Add `/send-verification-email` to `AUTH_RATE_LIMIT_PATHS` with 3/hour per email.
- **Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

---

### [WARNING] AA-012: Dual permission system — CASL and frontend matrix can diverge

- **Domain:** casl-rbac / frontend-guards
- **File:** `apps/web/src/lib/permissions.ts:1-47`
- **Issue:** Frontend uses a hand-maintained `PERMISSION_MATRIX` completely independent of the CASL `defineAbilitiesFor()` function. No mechanism ensures sync. Both auth-config and frontend-guards subagents flagged this independently.
- **Risk:** Frontend shows/hides UI inconsistently with backend enforcement — buttons visible but API returns 403, or features hidden that the user can access.
- **Recommendation:** Import and use `defineAbilitiesFor` from `@repo/auth` on the frontend (package already accessible) instead of the custom matrix.
- **Reference:** https://casl.js.org/v6/en/guide/intro#frontend

---

### [WARNING] AA-013: MANAGER has implicit delete via blanket `manage` on operational subjects

- **Domain:** casl-rbac
- **File:** `packages/auth/src/abilities.ts:68`
- **Issue:** MANAGER receives `can('manage', OPERATIONAL_SUBJECTS)` which grants `create`, `read`, `update`, AND `delete` on 8 entity types. The `manage` alias represents all actions in CASL.
- **Risk:** If a business rule later restricts MANAGER from deleting certain entities, the `manage` grant must be decomposed — a breaking change.
- **Recommendation:** Replace with explicit `can(['create', 'read', 'update', 'delete'], OPERATIONAL_SUBJECTS)` for granular future control.
- **Reference:** https://casl.js.org/v6/en/guide/define-rules#use-per-action-rules

---

### [WARNING] AA-014: Global search blocks VIEWER with `read all` check

- **Domain:** casl-rbac
- **File:** `apps/server/src/routes/v1/search/global-search.ts:27`
- **Issue:** Route checks `requireAbility('read', 'all')`. VIEWER has `read` on individual entities but not blanket `read all`. VIEWER is blocked from search despite being able to read every entity it returns.
- **Risk:** VIEWER users who should be able to search are incorrectly blocked.
- **Recommendation:** Use a dedicated `Search` subject or check `requireAbility('read', 'Client')` as a minimum.
- **Reference:** https://casl.js.org/v6/en/guide/define-rules

---

### [WARNING] AA-015: Notification mark-as-read uses `read` permission for a write operation

- **Domain:** casl-rbac
- **File:** `apps/server/src/routes/v1/notifications/mark-as-read.ts:18`
- **Issue:** Both `mark-as-read` and `mark-all-as-read` (POST routes that mutate state) use `requireAbility('read', 'Notification')`. Using `read` for a write operation weakens semantic meaning.
- **Risk:** Cannot restrict modification of notification state independently from reading it if needed in the future.
- **Recommendation:** Use `requireAbility('update', 'Notification')` and add `update` permission to relevant roles.
- **Reference:** https://casl.js.org/v6/en/guide/define-rules

---

### [WARNING] AA-016: No field-level conditions or ownership scoping in CASL rules

- **Domain:** casl-rbac
- **File:** `packages/auth/src/abilities.ts:46-93`
- **Issue:** All CASL rules are defined without conditions. A COMMERCIAL user can update any proposal in the organization, not just their own. Same for documents, clients, etc.
- **Risk:** Users with `update` permission can modify records created by other users within the same tenant.
- **Recommendation:** Evaluate if COMMERCIAL should only modify their own records. If so, add conditions: `can(['create', 'read', 'update'], 'Proposal', { createdBy: userId })`.
- **Reference:** https://casl.js.org/v6/en/guide/conditions-in-depth

---

### [WARNING] AA-017: `isSuperAdmin` field exists but is unused in RBAC

- **Domain:** casl-rbac
- **File:** `packages/auth/src/types.ts:9`, `packages/db/prisma/schema.prisma:28`
- **Issue:** `AuthUser` and Prisma `User` model both have `isSuperAdmin` boolean. Auth middleware populates it. But no route, ability definition, or middleware guard references it.
- **Risk:** If intended to grant elevated cross-org access, it is inert. If vestigial, it increases attack surface.
- **Recommendation:** Either implement super-admin CASL rules or remove the field.
- **Reference:** https://casl.js.org/v6/en/guide/define-rules

---

### [WARNING] AA-018: `tenantRoutes` lacks tenantMiddleware and requireAbility

- **Domain:** middleware-chain
- **File:** `apps/server/src/routes/v1/tenants/index.ts:5`
- **Issue:** The only v1 route module that skips both tenant middleware and ability checks. Returns organizations the authenticated user is a member of. Needed for org selection flow.
- **Risk:** Inconsistency could mask future bugs if new tenant-specific routes are added to this module.
- **Recommendation:** Add inline documentation explaining this is intentionally pre-tenant-selection. Consider extracting to `/api/v1/me/tenants`.
- **Reference:** https://fastify.dev/docs/latest/Reference/Hooks/#scope

---

### [WARNING] AA-019: `termsRoutes` lacks tenantMiddleware — uses non-null assertion

- **Domain:** middleware-chain
- **File:** `apps/server/src/routes/terms/get-terms-status.ts:18`
- **Issue:** Inside authenticated scope but no `tenantMiddleware`. Both handlers use `request.user!` (non-null assertion). If `authMiddleware` fails to populate `request.user`, the assertion throws an unhandled error.
- **Risk:** Runtime crash producing a 500 instead of a structured 401 response.
- **Recommendation:** Add null check or register with `requireAuth` as preHandler.
- **Reference:** https://fastify.dev/docs/latest/Reference/Hooks/#prehandler

---

### [WARNING] AA-020: `requireAuth` exported but never used (dead code)

- **Domain:** middleware-chain
- **File:** `apps/server/src/middlewares/auth-middleware.ts:50`
- **Issue:** `requireAuth` is defined and exported but never imported by any route. Documented middleware chain is `authMiddleware -> requireAuth -> tenantMiddleware -> requireAbility` but `requireAuth` is skipped in practice.
- **Risk:** Routes without `tenantMiddleware` (tenantRoutes, termsRoutes) have no explicit auth enforcement.
- **Recommendation:** Either remove (dead code) or add as scope-level hook after `authMiddleware` in `app.ts:299`.
- **Reference:** https://fastify.dev/docs/latest/Reference/Hooks/#prehandler

---

### [WARNING] AA-021: `create-chat-token` route has no requireAbility guard

- **Domain:** middleware-chain
- **File:** `apps/server/src/routes/v1/chat/create-chat-token.ts:8`
- **Issue:** `POST /api/v1/chat/token` is protected by auth + tenant middleware but has no `requireAbility` check. Any role (including VIEWER) can generate a chat JWT.
- **Risk:** VIEWER can obtain a chat token and interact with the chat system beyond intended permissions.
- **Recommendation:** Define a `Chat` subject in CASL and add `requireAbility('read', 'Chat')`.
- **Reference:** https://casl.js.org/v6/en/guide/define-rules

---

### [WARNING] AA-022: GET /api/v1/organization has no requireAbility guard

- **Domain:** middleware-chain
- **File:** `apps/server/src/routes/v1/organization/get-organization.ts:27`
- **Issue:** Behind auth + tenant but no ability check. Siblings (`updateOrganization`, `uploadLogo`) require `manage:Organization`. Any org member can read org details.
- **Risk:** Low direct risk (org name/slug/logo are non-sensitive) but inconsistent pattern.
- **Recommendation:** Add `requireAbility('read', 'Organization')` for consistency.
- **Reference:** https://casl.js.org/v6/en/guide/define-rules

---

### [WARNING] AA-023: Org cookie missing `Secure` flag in production

- **Domain:** frontend-guards
- **File:** `apps/web/src/lib/org-cookie.ts:5`
- **Issue:** `setActiveOrgCookie` sets `bens-active-org` with `samesite=lax` but omits `Secure`. Cookie transmitted over plain HTTP if user hits an HTTP URL.
- **Risk:** Organization ID leaked over unencrypted connection.
- **Recommendation:** Append `;secure` when `location.protocol === 'https:'`. Also add `;samesite=lax;secure` to `clearActiveOrgCookie` for matching attributes.
- **Reference:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies

---

### [WARNING] AA-024: Org cookie survives logout — session fixation across accounts

- **Domain:** frontend-guards
- **File:** `apps/web/src/features/auth/hooks/use-auth.ts:113-121`
- **Issue:** Logout clears React Query cache and redirects but deliberately preserves `bens-active-org` cookie. A different user logging in on the same browser auto-enters the previous user's org.
- **Risk:** In shared-device scenarios, user could operate under wrong organization context.
- **Recommendation:** Clear cookie on logout and rely on server-side `activeOrganizationId`, or document the shared-device risk explicitly.
- **Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

---

### [WARNING] AA-025: Chat JWT token not cleared on logout

- **Domain:** frontend-guards
- **File:** `apps/web/src/features/chat/lib/chat-api.ts:38`
- **Issue:** Chat JWT cached in module-scoped `let cachedToken`. `clearChatToken()` exists but is only called on 401 responses and socket disconnect — not during logout in `use-auth.ts`.
- **Risk:** Stale chat token authorizes requests for the previous user's session if the tab is reused without full reload.
- **Recommendation:** Call `clearChatToken()` in the logout `onSuccess` callback in `use-auth.ts`.
- **Reference:** https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

---

### [WARNING] AA-026: Action buttons visible to all roles in data tables

- **Domain:** frontend-guards
- **File:** `apps/web/src/features/clients/components/clients-columns.tsx:146-153`
- **Issue:** Action dropdown in table rows (clients, claims, commissions, etc.) renders Edit and Delete for every user regardless of role. Permission checks only exist on sidebar navigation.
- **Risk:** VIEWER/COMMERCIAL see Delete buttons that return 403. Leaks information about available actions.
- **Recommendation:** Pass user role to column definitions and conditionally render actions using `hasPermission()`.
- **Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html

---

### [WARNING] AA-027: Single JWT secret signs both operator and visitor tokens

- **Domain:** socket-auth
- **File:** `packages/env/src/index.ts:18`
- **Issue:** Same `SOCKET_JWT_SECRET` signs operator chat tokens and visitor widget tokens. Although Zod schemas differ, a single secret means compromise affects both trust domains.
- **Risk:** Secret leak allows forging both operator tokens (full agent access) and visitor tokens (conversation impersonation).
- **Recommendation:** Introduce separate `WIDGET_JWT_SECRET` for visitor tokens. Widget infrastructure is more exposed (runs on third-party sites).
- **Reference:** https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

---

### [WARNING] AA-028: jwt.verify() does not pin algorithms

- **Domain:** socket-auth
- **File:** `apps/chat-server/src/infra/socket/socket-auth.ts:32`
- **Issue:** All `jwt.verify(token, secret)` calls omit the `algorithms` option. jsonwebtoken v9 defaults to `['HS256']` with string secrets, which is safe, but not explicitly pinned.
- **Risk:** Without pinning, the "none" algorithm attack is one misconfiguration away if refactored to asymmetric keys.
- **Recommendation:** Add `{ algorithms: ['HS256'] }` to all 4 `jwt.verify()` call sites.
- **Reference:** https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/

---

### [WARNING] AA-029: JWT role claim validated as string, not enum

- **Domain:** socket-auth
- **File:** `apps/chat-server/src/infra/socket/socket-auth.ts:10`
- **Issue:** `socketJwtPayloadSchema` validates `role` as `z.string()`. The app has 5 valid roles. Same in `chat-auth-middleware.ts:9`.
- **Risk:** If downstream code falls through to a default branch for unknown roles, a forged role could bypass authorization. Mitigated by JWT signature, but defense-in-depth says validate precisely.
- **Recommendation:** Change to `z.enum(['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'])`.
- **Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

---

### [WARNING] AA-030: Widget reconnection does not refresh visitor token

- **Domain:** socket-auth
- **File:** `apps/widget/src/hooks/use-widget-socket.ts:55-61`
- **Issue:** Unlike the web app which refreshes tokens on reconnect, the widget creates the socket with `auth: { token: visitorToken }` and never refreshes it. After 24h expiry, all reconnection attempts fail.
- **Risk:** Visitors who leave the widget open > 24h silently lose real-time connectivity with no recovery.
- **Recommendation:** Listen for `connect_error` with token-expired message and trigger a new `POST /widget/conversations` for a fresh token.
- **Reference:** https://socket.io/docs/v4/client-options/#auth

---

### [WARNING] AA-031: Socket.IO CORS accepts all origins

- **Domain:** socket-auth
- **File:** `apps/chat-server/src/app.ts:146-156`
- **Issue:** CORS origin callback checks `allowedOrigins.has(origin)` but falls through to `callback(null, true)` for all origins. Intentional because `/widget` namespace must accept arbitrary widget-embedding domains, but this also opens the main operator namespace.
- **Risk:** Low practical risk — JWT is the real gate. A stolen token can be used from any origin without CORS blocking. One less defense layer for operators.
- **Recommendation:** Accepted risk — Socket.IO v4 doesn't support per-namespace CORS. Document explicitly. Consider separate server instance for widget in the future.
- **Reference:** https://socket.io/docs/v4/handling-cors/

---

### [WARNING] AA-032: RLS policies lack explicit WITH CHECK clause

- **Domain:** rls-tenant-isolation
- **File:** `packages/db/prisma/rls-policies.sql:62`
- **Issue:** All policies use only `USING (...)` without explicit `WITH CHECK (...)`. PostgreSQL defaults `WITH CHECK` to the `USING` expression, which is functionally correct. However, intent is implicit.
- **Risk:** A future developer might misread policy scope. Functionally safe today.
- **Recommendation:** Add explicit `FOR ALL` and `WITH CHECK (...)` clauses for clarity.
- **Reference:** https://www.postgresql.org/docs/current/sql-createpolicy.html

---

### INFO

---

### [INFO] AA-033: Login rate limit keyed by email only, no per-IP fallback

- **Domain:** auth-config
- **File:** `apps/server/src/middlewares/auth-rate-limit.ts:24`
- **Issue:** Login rate limit key is `auth:login:${email}`. Credential stuffing across many emails from a single IP is only limited by global 100/min.
- **Risk:** Credential stuffing attacks rotating emails are harder to throttle.
- **Recommendation:** Add secondary per-IP rate limit for login (e.g., 20/15min per IP).
- **Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html

---

### [INFO] AA-034: INTERNAL_API_SECRET is optional in env schema

- **Domain:** middleware-chain
- **File:** `packages/env/src/index.ts:53`
- **Issue:** Defined as `.optional()`. When unset, internal routes return 503 at runtime instead of failing at startup.
- **Risk:** Internal API silently disabled in production if env var is accidentally omitted.
- **Recommendation:** Make required or add startup health check warning.
- **Reference:** https://env.t3.gg/docs/recipes#required-env-vars

---

### [INFO] AA-035: Ability middleware leaks action/subject names in 403 response

- **Domain:** middleware-chain
- **File:** `apps/server/src/middlewares/ability-middleware.ts:30`
- **Issue:** 403 message includes `Insufficient permissions: ${action} ${subject}`, exposing the internal CASL model.
- **Risk:** Attacker can enumerate the permission model by probing endpoints.
- **Recommendation:** Return generic "Insufficient permissions" message. Log details server-side.
- **Reference:** https://owasp.org/www-project-web-security-testing-guide/

---

### [INFO] AA-036: Non-500 errors expose raw Fastify error messages

- **Domain:** middleware-chain
- **File:** `apps/server/src/app.ts:379`
- **Issue:** Error handler returns `error.message` verbatim for non-500 status codes. Some Fastify internal messages may contain implementation details.
- **Risk:** Low risk — most non-500 errors are well-formed. Not guaranteed for all status codes.
- **Recommendation:** Consider whitelisting which non-500 codes get the raw message.
- **Reference:** https://fastify.dev/docs/latest/Reference/Server/#seterrorhandler

---

### [INFO] AA-037: Proxy checks cookie presence but not validity

- **Domain:** frontend-guards
- **File:** `apps/web/src/proxy.ts:21-25`
- **Issue:** `getSessionToken` checks whether the session cookie exists but does not validate it. User sees dashboard shell briefly before API calls fail on expired session.
- **Risk:** Minor UX issue — not a security vulnerability since backend enforces auth.
- **Recommendation:** Acceptable as-is. Document the design choice.
- **Reference:** https://nextjs.org/docs/app/guides/authentication#optimistic-checks-with-middleware-optional

---

### [INFO] AA-038: JWTs lack issuer/audience claims

- **Domain:** socket-auth
- **File:** `apps/server/src/routes/v1/chat/create-chat-token.ts:34`
- **Issue:** Chat token payload has no `iss` or `aud` claims. Currently single issuer/consumer, but tokens could be misused if additional services are added.
- **Risk:** No immediate risk. Forward-looking hardening measure.
- **Recommendation:** Add `issuer: 'bens-seguros-server'` and `audience: 'bens-seguros-chat'` to `jwt.sign/verify`.
- **Reference:** https://datatracker.ietf.org/doc/html/rfc7519#section-4.1

---

### [INFO] AA-039: SOCKET_JWT_SECRET minimum is 16 chars vs 32 for AUTH_SECRET

- **Domain:** socket-auth
- **File:** `packages/env/src/index.ts:18`
- **Issue:** `z.string().min(16)` vs `AUTH_SECRET`'s `z.string().min(32)`. For HMAC-SHA256, key should ideally be 256 bits (32 bytes).
- **Risk:** 16-char secret is still infeasible to brute-force but below NIST recommendation.
- **Recommendation:** Change to `z.string().min(32)` to match `AUTH_SECRET`.
- **Reference:** https://datatracker.ietf.org/doc/html/rfc2104#section-3

---

### [INFO] AA-040: Duplicate Zod schema for visitor token

- **Domain:** socket-auth
- **File:** `apps/chat-server/src/infra/http/middleware/widget-auth.ts:6-11`
- **Issue:** `visitorTokenSchema` defined in both `widget-auth.ts` and `widget-socket-types.ts`. If one is updated without the other, validation could diverge.
- **Risk:** Schema drift could cause one path to accept tokens the other rejects.
- **Recommendation:** Remove duplicate and import from a single canonical location.
- **Reference:** DRY principle

---

### [INFO] AA-041: 6 Prisma models without corresponding CASL subject

- **Domain:** casl-rbac
- **File:** `packages/auth/src/abilities.ts:15-31`
- **Issue:** Session, Account, Verification, TermsAcceptance, ProposalChecklistItem, Occurrence, AuditLogArchive have no CASL subject. These are auth infrastructure, sub-entities, or archival tables.
- **Risk:** None — intentional omissions.
- **Recommendation:** No action needed. Document for future maintainers.
- **Reference:** N/A

---

### [INFO] AA-042: Password reset token in URL query string

- **Domain:** frontend-guards
- **File:** `apps/web/src/features/auth/components/reset-password-form.tsx:31`
- **Issue:** Token read from `searchParams.get('token')`. Standard for email-based reset flows. Token is single-use and time-limited.
- **Risk:** Minimal — appears in browser history and logs, but is one-time-use.
- **Recommendation:** No action needed. Optionally clean URL via `history.replaceState` after reading.
- **Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

---

## Passed Checks

### auth-config (13 passed)

- Session TTL reduced to 3 days with 12-hour rotation
- Email verification enabled when email provider is configured
- CSRF protection enabled (default — neither `disableCSRFCheck` nor `disableOriginCheck` set)
- Password hashing uses Better Auth built-in scrypt
- AUTH_SECRET enforces minimum 32 characters via Zod
- Rate limiting covers login (10/15min), registration (5/1hr), and forgot-password (3/1hr)
- Auth route handler does not leak sensitive data in errors
- Pino log redaction covers password, token, cookie, authorization, email, CPF, CNPJ
- Production env template leaves secrets blank with generation instructions
- customSession plugin strips sensitive fields (token, ipAddress) from responses
- trustedOrigins set to frontend URL only
- CORS restricted to `env.FRONTEND_URL` with `credentials: true`
- Fastify trustProxy enabled for accurate IP extraction behind reverse proxy

### casl-rbac (8 passed)

- `manage all` restricted to OWNER only
- COMMERCIAL and VIEWER lack delete actions on operational subjects
- All actions and subjects typed via `Action` and `Subject` union types — no loose strings
- Role hierarchy monotonically increasing (VIEWER=1 < COMMERCIAL=2 < MANAGER=3 < ADMIN=4 < OWNER=5)
- `requireAbility` middleware is type-safe (accepts only `Action` and `Subject`)
- Every authenticated route uses `requireAbility` in `preHandler` (73/73)
- VIEWER explicitly denied insurer access via `cannot('read', 'Insurer')` override
- Unit tests cover core role assertions

### middleware-chain (16 passed)

- All 16 v1 route modules apply `tenantMiddleware` via `addHook('preHandler')`
- Auth middleware applied at encapsulated scope level in `app.ts:299`
- Middleware ordering correct: auth -> tenant -> ability (never inverted)
- All sensitive v1 routes have `requireAbility` with appropriate action/subject
- Internal HMAC auth uses timing-safe comparison (`timingSafeEqual`)
- HMAC timestamp freshness enforced with 300s window
- Internal routes use `internalAuthMiddleware` at module level
- Error handler masks 500-level messages with generic text
- No stack traces or internal error details in responses
- No business logic in middleware
- Public invitation routes intentionally unauthenticated with dedicated rate limiting
- Auth rate limiting on sign-in, sign-up, forgot-password
- Bull Board protected with auth + tenant + `requireAbility('manage', 'all')`
- Internal routes create tenant-scoped Prisma client via `createTenantClient(organizationId)`
- `handleDomainError` only exposes domain error codes, not internals
- HMAC signature length validated before timing-safe comparison

### rls-tenant-isolation (10 passed)

- All 16 tables with organizationId have RLS policies
- All 16 tables have FORCE ROW LEVEL SECURITY
- Permissive policies justified (only Member, Invitation, AuditLogArchive — auth/worker tables)
- Default deny: missing tenant context returns zero rows for strict policies
- Tenant client uses batch transactions (not interactive) to avoid pool issues
- `set_config` uses `true` for transaction-local scope (no cross-request leakage)
- Global search route uses `request.tenantPrisma!` correctly
- Internal leads routes use `createTenantClient(organizationId)` correctly
- Tables without organizationId correctly lack RLS (User, Session, Account, etc.)
- `db:push:dev` auto-reapplies RLS policies after schema push

### frontend-guards (13 passed)

- No tokens or session data stored in localStorage
- `credentials: 'include'` set on all API fetch calls
- No hardcoded auth tokens or API keys in frontend source
- No auth-related `process.env` secrets exposed on client side
- Dashboard routes protected by session check in proxy.ts
- Redirect to `/login` on missing session, `/select-org` on missing org
- Org cookie contains only organizationId string (no sensitive data)
- React Query cache fully cleared on logout
- CSP configured with nonce-based script-src and frame-ancestors 'none'
- Security headers: HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy
- Auth pages redirect authenticated users to dashboard
- Sidebar navigation items filtered by role-based permissions
- Uses `proxy.ts` (Next.js 16 convention) instead of deprecated middleware.ts

### socket-auth (7 passed)

- JWT validated during Socket.IO handshake (not post-connection)
- All JWTs use 24h expiration
- All JWT payloads Zod-validated after decoding
- Namespaces isolated: main (operator) vs widget (visitor) with separate auth and room schemes
- Token generation endpoint behind authMiddleware + tenantMiddleware
- Widget tokens contain only IDs (no PII)
- Web app refreshes token on reconnect via `clearChatToken()` + `getChatToken()`

---

## Checklist Coverage

| Subagent             | Checks  | Findings | Passed |
| -------------------- | ------- | -------- | ------ |
| auth-config          | 17      | 4        | 13     |
| casl-rbac            | 18      | 10       | 8      |
| middleware-chain     | 23      | 7        | 16     |
| rls-tenant-isolation | 17      | 5        | 10\*   |
| frontend-guards      | 21      | 8        | 13     |
| socket-auth          | 15      | 8        | 7      |
| **Total**            | **111** | **42**   | **67** |

\*Note: 2 findings are also documented as INFO (acceptable tradeoffs)

---

## Top Priority Remediation

| #   | Finding                                     | Effort        | Impact                            |
| --- | ------------------------------------------- | ------------- | --------------------------------- |
| 1   | AA-001: Verify RLS DB role                  | Low (1 query) | Determines if RLS works at all    |
| 2   | AA-002: Fix audit-logs requireAbility       | Low (1 line)  | Broken access for ADMIN/MANAGER   |
| 3   | AA-003: Add COMMERCIAL `approve Commission` | Low (1 line)  | Broken commission workflow        |
| 4   | AA-025: Clear chat token on logout          | Low (1 line)  | Stale auth after logout           |
| 5   | AA-028: Pin JWT algorithm HS256             | Low (4 lines) | Algorithm confusion prevention    |
| 6   | AA-029: Role z.enum() validation            | Low (2 lines) | Input validation hardening        |
| 7   | AA-004: Worker tenant context               | Medium        | Worker may silently fail with RLS |
| 8   | AA-012: Unify permission system             | Medium        | Prevent frontend/backend drift    |
| 9   | AA-008: Required email verification in prod | Medium        | Prevent unverified email signups  |
| 10  | AA-023: Org cookie Secure flag              | Low (1 line)  | Cookie transmitted over HTTP      |
