# Production Readiness — Remediation Plan Design

**Date:** 2026-04-12
**Status:** Approved
**Author:** Artur + Claude

## Context

Multi-tenant SaaS ERP for Brazilian insurance brokers. System is deployed on VPS (Hostinger Brazil) but has no real clients yet. A comprehensive auth security audit (`audit/auth-audit-2026-04-12.md`) identified 3 CRITICAL, 29 WARNING, and 10 INFO findings. A holistic production readiness assessment across 7 dimensions revealed additional gaps in observability, LGPD compliance, and operational resilience.

### Current State

| Dimension     | Score      | Key Gaps                                                                  |
| ------------- | ---------- | ------------------------------------------------------------------------- |
| Security      | 7.5/10     | 3 CRITICAL RBAC/RLS findings, JWT hardening, dual permission system       |
| Observability | 4/10       | No metrics, no distributed tracing, no alerts, basic Sentry               |
| Operational   | 7.5/10     | Good deploy pipeline, no DR plan, no backup encryption                    |
| Performance   | 8.2/10     | Excellent pagination/N+1, conservative caching                            |
| LGPD          | 6/10       | Policy exists, missing deletion endpoint + portability + granular consent |
| Features      | 8.5/10     | Core complete, widget deferred                                            |
| **Overall**   | **6.9/10** | **Functional but not ready for real client data**                         |

### Approach

Phased remediation: fix blockers first (Fase 1, ~3-4 days), onboard first client, then harden in parallel with real usage (Fase 2, 2-3 weeks), ongoing improvements after (Fase 3).

## Decisions

| Decision                         | Choice                                                   | Rationale                                                                  |
| -------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| Phasing strategy                 | 3 phases (desbloqueio → hardening with client → backlog) | Solo dev, needs real feedback; can't afford 4-week hardening without usage |
| RLS verification first           | AA-001 determines if RLS works at all                    | Every other RLS finding depends on this answer                             |
| LGPD deletion before launch      | Required for insurance data (CPF/CNPJ)                   | Legal obligation under LGPD Art. 18                                        |
| Observability in Fase 2          | Request IDs + Sentry alerts, defer Prometheus            | Enough to debug issues from first client; full metrics can wait            |
| Permission unification in Fase 2 | Unify CASL → frontend after quick fixes                  | Larger refactor, not a blocker for first client                            |

---

## Fase 1: Desbloqueio (~3-4 days)

**Goal:** Remove all blockers for first real client. After this phase, the system is safe enough to handle real insurance data.

**Gate:** All items completed + `pnpm lint && pnpm typecheck && pnpm build && pnpm test` pass.

### 1.1 Security CRITICAL Fixes

#### AA-001: Verify RLS DB role

- Run `SELECT current_user, usesuper FROM pg_user WHERE usename = current_user` on production DB
- If superuser: RLS is bypassed entirely → create dedicated `app_user` role subject to RLS, update `DATABASE_URL`
- If not superuser: verify with `SET app.current_tenant = 'test-org-id'; SELECT count(*) FROM "Client";` — should return 0 for non-existent org
- Add startup health check in `apps/server/src/server.ts` that verifies RLS is active
- **Files:** `packages/db/src/index.ts`, `apps/server/src/server.ts`, `.env.example.prod`
- **Effort:** 1h investigation, 2-4h fix if role needs changing

#### AA-002: Fix audit-logs requireAbility

- Change `requireAbility('manage', 'all')` → `requireAbility('read', 'AuditLog')`
- **File:** `apps/server/src/routes/v1/audit-logs/list-audit-logs.ts:19`
- **Effort:** 5min

#### AA-003: COMMERCIAL approve Commission

- Add `can('approve', 'Commission')` to COMMERCIAL role
- Verify the two-step approval workflow: COMMERCIAL approves first → ADMIN/MANAGER confirms
- **File:** `packages/auth/src/abilities.ts:78-83`
- **Effort:** 15min (5min code + 10min verify workflow)

### 1.2 LGPD Blockers

#### LGPD Data Deletion Endpoint

- Create `DELETE /api/v1/clients/:id/lgpd-delete` route
- Use case: `LgpdDeleteClient` in `packages/core/src/modules/client/application/`
- Logic follows `docs/SECURITY-SPEC.md` Section 4:
  1. Anonymize PII in Client record (name → "Cliente removido", null out all PII fields)
  2. Keep transactional records (Proposal, Policy, Commission) — fiscal retention 5 years
  3. Delete chat data (MongoDB: Contact → Conversation → Message)
  4. Delete documents from R2 storage
  5. Anonymize audit log snapshots (before/after → null)
  6. Create LGPD_DELETION audit log entry
- Guard: `requireAbility('delete', 'Client')` — OWNER and ADMIN only
- Frontend: Confirmation dialog requiring client name typed to confirm (destructive action)
- **Files:** New use case, new route, new frontend dialog
- **Effort:** 1-2 days

#### Privacy Policy Placeholders

- Replace `[INSERIR EMAIL DO DPO]`, `[INSERIR RAZÃO SOCIAL]`, `[INSERIR CNPJ]` with real org data
- These are in the privacy policy page rendered at `/privacy`
- **Files:** `apps/web/src/app/(auth)/privacy/page.tsx` or equivalent
- **Effort:** 30min (need Artur to provide the real values)

### 1.3 Security Quick Wins (Tier 2, <2h total)

#### AA-025: Clear chat token on logout

- Call `clearChatToken()` in logout `onSuccess` callback
- **File:** `apps/web/src/features/auth/hooks/use-auth.ts:113-121`
- **Effort:** 5min

#### AA-028: Pin JWT algorithm

- Add `{ algorithms: ['HS256'] }` to all 4 `jwt.verify()` call sites
- **Files:** `apps/chat-server/src/infra/socket/socket-auth.ts:32`, `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts`, `apps/chat-server/src/infra/http/middleware/widget-auth.ts`, `apps/server/src/routes/v1/chat/create-chat-token.ts`
- **Effort:** 15min

#### AA-029: Role z.enum() validation

- Change `z.string()` → `z.enum(['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'])` in JWT payload schemas
- **Files:** `apps/chat-server/src/infra/socket/socket-auth.ts:10`, `apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts:9`
- **Effort:** 15min

#### AA-023: Org cookie Secure flag

- Append `;secure` when `location.protocol === 'https:'`
- **File:** `apps/web/src/lib/org-cookie.ts:5`
- **Effort:** 5min

#### AA-024: Clear org cookie on logout

- Clear `bens-active-org` cookie in logout callback to prevent session fixation on shared devices
- **File:** `apps/web/src/features/auth/hooks/use-auth.ts:113-121`
- **Effort:** 15min

#### AA-008: Email verification required in production

- Make `RESEND_API_KEY` required when `NODE_ENV === 'production'`, or always set `requireEmailVerification: true`
- **File:** `packages/auth/src/index.ts:70`, `packages/env/src/index.ts`
- **Effort:** 30min

#### AA-011: Rate limit email verification resend

- Add `/send-verification-email` to `AUTH_RATE_LIMIT_PATHS` (3/hour per email)
- **File:** `apps/server/src/middlewares/auth-rate-limit.ts:16-42`
- **Effort:** 15min

#### Chat-worker Pino redaction

- Import and apply `PINO_REDACT_CONFIG` from `@repo/shared` in chat-worker logger
- **File:** `apps/chat-worker/src/index.ts:37-40`
- **Effort:** 5min

#### Worker Pino redaction

- Same fix for ERP worker
- **File:** `apps/worker/src/index.ts` (verify logger config)
- **Effort:** 5min

---

## Fase 2: Hardening com Cliente (~2-3 weeks, parallel with real usage)

**Goal:** Production-robust system with proper observability and compliance.

### 2.1 Observability Foundation

#### Request ID propagation

- Generate UUID per request in Fastify `onRequest` hook
- Add to Pino child logger context (`requestId`)
- Propagate via `x-request-id` header on inter-service calls (server → chat-server)
- Include in BullMQ job data for worker correlation
- **Files:** `apps/server/src/app.ts`, `apps/chat-server/src/app.ts`, worker processors
- **Effort:** 4h

#### Sentry service names + alerts

- Set `serverName` in `Sentry.init()` for each app (server, chat-server, worker, chat-worker)
- Configure Sentry alert rules: error rate spike, new issue, P99 latency
- Add Slack/email notification channel
- **Files:** All `Sentry.init()` call sites
- **Effort:** 2h

#### BullMQ error → Sentry

- Add error handler in worker processors that captures to Sentry with job context
- **Files:** `apps/worker/src/index.ts`, `apps/chat-worker/src/index.ts`
- **Effort:** 2h

### 2.2 Security Hardening

#### AA-012: Unify permission system

- Remove `apps/web/src/lib/permissions.ts` PERMISSION_MATRIX
- Import `defineAbilitiesFor` from `@repo/auth` on the frontend
- Replace all `hasPermission(role, resource, action)` calls with CASL `ability.can(action, subject)`
- **Files:** `apps/web/src/lib/permissions.ts`, all components using `hasPermission`
- **Effort:** 4h

#### AA-026: Action buttons RBAC

- Pass user abilities to table column definitions
- Conditionally render Edit/Delete actions based on `ability.can('update', subject)` / `ability.can('delete', subject)`
- Affects: clients, proposals, policies, claims, commissions, endorsements, assistances columns
- **Effort:** 4h (after AA-012 unification)

#### AA-004: Worker tenant context decision

- Investigate: does the worker DB role bypass FORCE RLS?
- If yes: document explicitly, add organizationId guards in all worker processors
- If no: use `createTenantClient(organizationId)` in all processors
- **Files:** `apps/worker/src/processors/`, `apps/chat-worker/src/processors/`
- **Effort:** 4h

### 2.3 LGPD Completion

#### Granular consent management

- Add consent preferences in Settings page (email marketing, analytics, AI processing)
- Store per-user consent with version tracking
- Add withdrawal of consent UI ("Revogar consentimento" button)
- **Effort:** 1 day

#### Vendor DPA verification

- Verify LGPD-compliant DPAs with: Resend (email), Anthropic (AI), Cloudflare (R2/CDN), Hostinger (VPS)
- Document in `docs/VENDOR-COMPLIANCE.md`
- **Effort:** 1 day (research + documentation)

### 2.4 Operational Resilience

#### Backup encryption

- Add `openssl enc -aes-256-cbc` to `scripts/backup.sh` or enable R2 server-side encryption
- Verify restore process with encrypted backups
- **Effort:** 2h

#### DR plan documented + tested

- Write `docs/DISASTER-RECOVERY.md` with step-by-step runbook
- Define RTO (target: <1h) and RPO (target: <24h with daily backups)
- Test full restore: new VPS → deploy → restore backup → verify data
- **Effort:** 1 day (documentation + test)

### 2.5 Performance Quick Wins

#### React Query staleTime

- Change default `staleTime` from 60s to 5 minutes
- Keep 60s for dashboard stats (already cached server-side)
- **File:** `apps/web/src/providers/index.tsx`
- **Effort:** 15min

#### Missing database indexes

- Add `@@index([organizationId, userId, createdAt(sort: Desc)])` to Notification and AuditLog
- **File:** `packages/db/prisma/schema.prisma`
- **Effort:** 30min + migration

---

## Fase 3: Backlog (ongoing)

Lower priority items to address as the product matures:

### Security

- AA-027: Separate `WIDGET_JWT_SECRET` for visitor tokens
- AA-038: Add `issuer`/`audience` claims to JWTs
- AA-039: Increase `SOCKET_JWT_SECRET` minimum to 32 chars
- AA-013: Decompose MANAGER `manage` into explicit permissions
- AA-016: CASL field-level conditions for COMMERCIAL ownership scoping
- AA-017: Decide on `isSuperAdmin` — implement or remove
- AA-010: Replace `.env.example` ENCRYPTION_KEY with invalid placeholder

### Observability

- Prometheus metrics (`prom-client`) + Grafana dashboards
- Distributed tracing (OpenTelemetry between services)
- Database query monitoring (Prisma.$extends for slow queries >100ms)
- Health check /readiness + /liveness for all services including workers
- Core Web Vitals tracking on frontend

### Performance

- Bundle analyzer + dynamic imports for heavy components
- Dashboard materialized view (when >100k proposals per org)
- Redis caching layer for hot entity lookups
- Logo upload magic byte validation

### LGPD

- Data portability endpoint (`/api/v1/user/export`)
- Incident response procedure (72h breach notification workflow)
- Marketing consent separate from T&Cs

### Features

- Missing email templates (commission approved, claim opened, policy expiring 30d)
- Web chat widget implementation
- CSV export (pending product decision)

---

## Success Criteria

### Fase 1 Complete When:

- [ ] RLS verified working (AA-001 resolved with evidence)
- [ ] AA-002, AA-003 fixed and tested
- [ ] LGPD deletion endpoint functional (use case + route + frontend dialog)
- [ ] Privacy policy has real org data (no placeholders)
- [ ] All Tier 2 quick wins deployed (AA-025, 028, 029, 023, 024, 008, 011, worker redaction)
- [ ] 5 quality gates pass (`lint`, `typecheck`, `build`, `test`, acceptance)

### Fase 2 Complete When:

- [ ] Request IDs in all services, visible in logs
- [ ] Sentry alerts configured and tested
- [ ] CASL unified frontend/backend (PERMISSION_MATRIX removed)
- [ ] Table action buttons respect RBAC
- [ ] Granular consent UI in Settings
- [ ] DR plan documented and tested (successful restore from backup)
- [ ] Encrypted backups verified

### Fase 3:

- Ongoing, no hard deadline. Prioritized by client feedback and incidents.

---

## References

- Auth Audit: `audit/auth-audit-2026-04-12.md`
- Security Spec: `docs/SECURITY-SPEC.md`
- Architecture Decisions: `docs/ARCHITECTURE-DECISIONS.md`
- LGPD deletion flow: `docs/SECURITY-SPEC.md` Section 4
