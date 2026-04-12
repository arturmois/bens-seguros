# Auth Security Audit Skill — Design Spec

**Date:** 2026-04-12
**Status:** Draft
**Author:** Artur + Claude

## Goal

Create a reusable skill (`auth-security-audit`) that performs a comprehensive audit of the authentication and authorization implementation in the bens-seguros SaaS monorepo. The skill compares the current implementation against official library recommendations (Better Auth, CASL, Next.js, Fastify, Prisma RLS) and security best practices (OWASP, SOLID), producing a categorized findings report.

## Decisions

| Decision         | Choice                                                                                        | Rationale                                     |
| ---------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Scope            | Complete audit (auth config, CASL, middleware, RLS, HMAC, Socket.IO, frontend, rate limiting) | Covers all auth surfaces in one pass          |
| Output           | Markdown report (`audit/auth-audit-YYYY-MM-DD.md`)                                            | Versionable, reviewable, persistent           |
| Knowledge source | Real-time docs via context7 MCP                                                               | Always up-to-date with lib versions           |
| Analysis type    | Static analysis + light verification (grep-based checks)                                      | Catches real issues without side effects      |
| Architecture     | Subagents in parallel (one per domain)                                                        | ~3x faster than sequential, isolated concerns |

## Skill Structure

### Invocation

```
/auth-security-audit
```

No arguments. The skill auto-detects the project stack from `package.json`, `packages/auth/`, and `CLAUDE.md`.

### Execution Flow

```
1. Detect stack (read package.json, CLAUDE.md)
2. Create audit/ directory if missing
3. Dispatch 6 subagents in parallel via Agent tool
4. Each subagent: fetch docs via context7 → read/grep files → return findings
5. Consolidate findings from all subagents
6. Sort by severity (CRITICAL → WARNING → INFO → PASS)
7. Write audit/auth-audit-YYYY-MM-DD.md
8. Print summary to terminal
```

## Subagents

### 1. auth-config

**Scope:** Better Auth configuration, session management, cookie settings, env vars.

**Files to analyze:**

- `packages/auth/src/index.ts`
- `packages/auth/src/client.ts`
- `packages/auth/src/types.ts`
- `packages/env/src/index.ts`
- `apps/server/src/routes/auth-routes.ts`
- `apps/server/src/middlewares/auth-rate-limit.ts`
- `.env.example`

**Checks:**

- Session TTL and rotation follow Better Auth recommendations
- Email verification is enabled
- Cookie attributes: httpOnly, secure, sameSite set correctly
- Password hashing uses bcrypt or argon2 (not md5/sha)
- CSRF protection is configured
- Auth env vars present in `.env.example`
- Secrets have sufficient entropy (not defaults in production)
- Rate limiting covers login, register, forgot-password endpoints
- Rate limit windows and thresholds are reasonable

**context7 docs:** Better Auth (session config, security, plugins)

### 2. casl-rbac

**Scope:** CASL ability definitions, role hierarchy, permission design.

**Files to analyze:**

- `packages/auth/src/abilities.ts`
- `packages/auth/src/roles.ts`

**Checks:**

- Principle of least privilege — each role has only what it needs
- All domain entities are covered as CASL subjects
- `manage all` restricted to OWNER only
- COMMERCIAL/VIEWER lack destructive actions (delete, approve)
- Role hierarchy is consistent — lower roles never exceed higher role permissions
- Field-level conditions used where applicable
- No orphan subjects (defined but never checked) or orphan actions
- Abilities type-safe (no string literals that could drift)

**context7 docs:** CASL (defineAbility, best practices, TypeScript integration)

### 3. middleware-chain

**Scope:** Server middleware ordering, route protection, internal API auth.

**Files to analyze:**

- `apps/server/src/middlewares/auth-middleware.ts`
- `apps/server/src/middlewares/tenant-middleware.ts`
- `apps/server/src/middlewares/ability-middleware.ts`
- `apps/server/src/middlewares/internal-auth-middleware.ts`
- `apps/server/src/middlewares/auth-rate-limit.ts`
- `apps/server/src/routes/v1/**/index.ts` (all route registrations)
- `apps/server/src/routes/internal/` (internal routes)
- `apps/server/src/app.ts`

**Checks:**

- Every `/api/v1/*` route has authMiddleware + tenantMiddleware in preHandler
- Sensitive routes have requireAbility with correct action/subject
- Middleware ordering: auth → tenant → ability (never inverted)
- Public routes are explicitly and intentionally unprotected
- HMAC internal auth: timestamp freshness check, timing-safe compare
- Grep for routes without auth preHandler
- No business logic in middleware (delegate to use cases)
- Error responses don't leak internal details (stack traces, SQL)

**Grep verifications:**

- `grep` all route files for `preHandler` to verify auth chain presence
- `grep` for `requireAbility` usage matches the CASL subjects defined

**context7 docs:** Fastify (hooks, preHandler, lifecycle), Better Auth (middleware)

### 4. rls-tenant-isolation

**Scope:** PostgreSQL RLS policies, tenant client usage, query isolation.

**Files to analyze:**

- `packages/db/prisma/rls-policies.sql`
- `packages/db/prisma/schema.prisma`
- `packages/db/src/tenant-client.ts`
- `packages/db/src/index.ts`

**Checks:**

- Every table with `organizationId` column has an RLS policy
- Policies use `FORCE ROW LEVEL SECURITY` on table owner
- Permissive vs strict policies are justified (only auth/worker tables should be permissive)
- `tenantPrisma` (not global `prisma`) used in domain query handlers
- Default deny behavior: missing tenant context returns zero rows
- No raw SQL that bypasses RLS
- Transaction pattern uses batch (not interactive) to avoid connection pool issues

**Grep verifications:**

- `grep` for `prisma.` (global client) in route handlers that should use `tenantPrisma`
- `grep` for `$queryRaw` or `$executeRaw` that might bypass RLS
- Cross-reference schema `organizationId` columns against RLS policy coverage

**context7 docs:** Prisma (raw queries, extensions, transactions)

### 5. frontend-guards

**Scope:** Route protection, session handling, token storage, CASL in UI.

**Files to analyze:**

- `apps/web/src/lib/auth-client.ts`
- `apps/web/src/lib/org-cookie.ts`
- `apps/web/src/features/auth/hooks/use-auth.ts`
- `apps/web/src/components/layout/dashboard-shell.tsx`
- `apps/web/src/app/(dashboard)/` (protected pages)
- `apps/web/src/app/(auth)/` (auth pages)
- `apps/web/src/middleware.ts` (if exists)

**Checks:**

- Dashboard routes protected by session check (DashboardShell or equivalent)
- Redirect to `/login` on expired/missing session
- No tokens or session data in localStorage (cookies only)
- CASL abilities used to hide/disable UI for unauthorized actions
- Org cookie contains only organizationId (no sensitive data)
- `credentials: 'include'` on all API calls
- No hardcoded auth tokens in frontend code
- Auth state properly cleared on logout (React Query cache, cookies)
- No sensitive data in URL params (tokens, session IDs)

**Grep verifications:**

- `grep` for `localStorage` usage related to auth/tokens
- `grep` for `credentials` in fetch/axios calls
- `grep` for `process.env` with auth-related vars on client side

**context7 docs:** Next.js (authentication, middleware, route protection)

### 6. socket-auth

**Scope:** Socket.IO authentication, widget auth, namespace isolation.

**Files to analyze:**

- `apps/chat-server/src/infra/socket/socket-auth.ts`
- `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts`
- `apps/chat-server/src/infra/http/middleware/widget-auth.ts`
- `apps/chat-server/src/app.ts`
- `apps/server/src/routes/v1/chat/create-chat-token.ts`

**Checks:**

- JWT validated during handshake (not post-connection)
- Token expiration is reasonable (not infinite, not too short)
- JWT payload validated with Zod schema (not just decoded)
- Namespaces isolated: main (authenticated users) vs widget (visitors)
- CORS config: widget accepts origins but validates via JWT
- Token generation endpoint requires authentication
- Reconnection revalidates token
- No JWT secret shared across unrelated services
- Widget tokens contain minimal data (no user PII)

**context7 docs:** Socket.IO (authentication, namespaces, middleware)

## Report Format

```markdown
# Auth & Authorization Security Audit

**Date:** YYYY-MM-DD
**Project:** bens-seguros
**Stack:** Better Auth 1.0 + CASL 6 + Prisma 7 RLS + Fastify 5 + Next.js 16

## Summary

- CRITICAL: X
- WARNING: Y
- INFO: Z
- PASS: W

## Findings

### [CRITICAL] AA-001: <title>

- **Domain:** auth-config | casl-rbac | middleware-chain | rls-tenant-isolation | frontend-guards | socket-auth
- **File:** `path/to/file.ts:42`
- **Issue:** Description of the problem found
- **Risk:** What can happen if not fixed
- **Recommendation:** How to fix it
- **Reference:** Link to official documentation

### [WARNING] AA-002: <title>

...

### [INFO] AA-003: <title>

...

## Passed Checks

List of verifications that passed (evidence of audit coverage)

## Checklist Coverage

| Subagent    | Checks Run | Findings | Pass |
| ----------- | ---------- | -------- | ---- |
| auth-config | N          | X        | Y    |
| casl-rbac   | N          | X        | Y    |
| ...         | ...        | ...      | ...  |
```

### Severity Criteria

| Severity     | Criteria                                            | Examples                                                                         |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| **CRITICAL** | Exploitable vulnerability or data leak              | Route without auth, table missing RLS, tenant isolation bypass                   |
| **WARNING**  | Best practice deviation with potential risk         | Long session TTL, over-permissive role, missing rate limit on sensitive endpoint |
| **INFO**     | Improvement suggestion, code smell, maintainability | Code duplication, SOLID violation, naming inconsistency                          |
| **PASS**     | Check executed and passed                           | Evidence that the audit covered this area                                        |

### Finding IDs

Format: `AA-NNN` (Auth Audit, sequential number). Unique per audit run, used for reference in follow-up tasks.

## Subagent Prompt Template

Each subagent receives:

```
You are auditing the {domain} of a multi-tenant SaaS (bens-seguros).

**Your task:**
1. Fetch current docs for {libraries} via context7 MCP (resolve-library-id → query-docs)
2. Read the files listed below
3. Run grep verifications listed below
4. Compare implementation against official docs and security best practices
5. Return findings as structured list

**Files to read:**
{file_paths}

**Grep verifications:**
{grep_commands}

**Checks to perform:**
{checklist}

**Return format (one per finding):**
- severity: CRITICAL | WARNING | INFO
- title: Short description
- domain: {domain}
- file: path/to/file.ts:line
- issue: What is wrong
- risk: What can happen
- recommendation: How to fix
- reference: Doc URL

Also return passed checks with severity: PASS.
```

## Skill Location

The skill file will be created at the superpowers skills directory as a user-invocable skill:

```
~/.claude/skills/auth-security-audit.md
```

This keeps it project-agnostic and available across all projects with this stack.
