# Migration Plan — Modular Architecture (incremental)

> **Date:** 2026-09-13 · **Snapshot:** `main` @ `833fff33`
> **Target:** the _revised_ architecture approved after the review of MOD-1 (summary in §1). `2026-09-13-modular-architecture.md`, `context-map.md` and MOD-1 in `ARCHITECTURE-DECISIONS.md` still describe the **pre-review** version — update them in Step 1.0.
> **Inputs:** [`../audits/2026-09-13-domain-analysis.md`](../audits/2026-09-13-domain-analysis.md) (D#/S# references).

---

## 0. Ground rules (apply to every step)

| Rule                                                                                                                     | How it is checked                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **One step = one PR**, mergeable on its own, `main` stays deployable                                                     | 5 quality gates green (`lint`, `typecheck`, `build`, `test`, ACs)                                                |
| **No behavior change.** Known bugs (S1–S20) are preserved and only _relocated_; fixes are separate tickets after Phase 7 | Characterization specs written **before** moving logic                                                           |
| **No public HTTP contract change**                                                                                       | `pnpm --filter @app/web generate:api` produces **zero diff** in `apps/web/src/api/`                              |
| **No destructive schema change.** Only additive migrations (Step 5.4 is the only one, and optional)                      | `prisma migrate diff` reviewed in PR                                                                             |
| **BullMQ job payloads unchanged**                                                                                        | Jobs enqueued by the old code are consumable by the new code and vice-versa → revert is safe with jobs in flight |
| **`@repo/core` root barrel stays as a compatibility layer until Step 7.1**                                               | Apps keep compiling while modules move underneath                                                                |
| **Move, then change.** A step that moves files contains no logic edits; a step that relocates logic doesn't also rename  | Reviewable diffs; `git log --follow` keeps history                                                               |
| **Default rollback = `git revert <merge commit>`** + redeploy tag                                                        | Valid for every step because of the 4 rules above; exceptions are called out per step                            |

**Test infrastructure gap (fix before Phase 4):** CI (`.github/workflows/ci.yml`) has **no Postgres service** — only `db:generate` against a dummy URL — and the only DB-backed spec is `prisma-client-repository.spec.ts`. Route specs mock `container.resolve` (`__tests__/helpers/mock-use-case.ts`), so they don't exercise logic. Phases 3–6 move Prisma queries; without DB-backed specs a moved query can break silently. Step 3.0 adds a Postgres service and a repository spec harness.

**Smoke flows** (manual via Playwright MCP, run on the phase's last PR): login + org switch · invite & accept member · create proposal → advance to POLICY_ISSUED → issue policy → commission appears · upload CNH on proposal → checklist item completes · send quote · approve/reject/pay/reverse commission · create claim · chat lead capture (widget) · CSV import clients + policies · dashboard loads.

---

## 1. Target (approved revised map)

```
packages/core/src/
  shared-kernel/   ids · money (Cents, BasisPoints) · domain-error · cursor-page · json
  platform/        audit · storage · lookups (cep, vehicle) · csv · cache
  modules/
    sales/         leads/ · proposals/ · policies/          (domain module)
    commissions/                                            (domain module)
    servicing/     claims · occurrences · assistance        (domain module)
    clients/ insurers/ documents/ workspace/ billing/
    notifications/ (delivery only) · performance/ (goals + dashboard) · search/   (simple modules)
    compliance/    anonymize-client process
packages/conversations/   (later; not in this plan)
```

- Cross-module calls = direct import of the provider's public `index.ts`; ports only for vendors and chat → ERP (HMAC).
- No event bus, no outbox, no UnitOfWork. `prisma.$transaction` only where atomicity is required.
- Each module receives a **narrowed Prisma type** (`Pick<PrismaClient, owned delegates>`), so reach-through writes fail to compile.
- DI tokens become abstract classes (import-visible), not strings.
- Workspace is an ACL over Better Auth: Better Auth writes identity tables, workspace exposes queries and domain extensions.
- Entitlements contract stays in `@repo/auth/entitlements` (already true — `billing` produces it, `auth` consumes it, `auth` never imports core).

### Phase naming (template → this codebase)

| Requested phase                           | Here                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1 Extract authentication boundary         | **Identity & workspace boundary** (Better Auth ACL, membership resolution, entitlements access) |
| 2 Extract driver module                   | **Member directory** (salespeople, recipients, role groups)                                     |
| 3 Extract ride domain                     | **Sales domain** (leads + proposals + policies)                                                 |
| 4 Move ride persistence behind repository | **Sales persistence behind repositories/queries**                                               |
| 5 Extract financial rules                 | **Commissions & money rules**                                                                   |
| 6 Remove legacy cross-module dependencies | same                                                                                            |
| 7 Enforce module boundaries               | same                                                                                            |

Dependency order: 1 → 2 → 3 → 4 → 5 → 6 → 7. Step 7.3 (lint in **warn** mode) may land right after Step 1.0 to measure progress.

---

## Phase 1 — Identity & workspace boundary

**Why first:** identity is on every request path, the rules are small, and later phases (member directory, commission notifications) need a stable `workspace` API.

### Step 1.0 — Record the approved architecture (docs only)

- **Current state:** MOD-1, the design doc and `context-map.md` describe the pre-review design (14 contexts, gateways, outbox).
- **Target state:** MOD-1 updated to the revised map (§1); design doc marked "superseded by review" with a link; `context-map.md` rewritten to the revised dependency list.
- **Files/modules affected:** `docs/ARCHITECTURE-DECISIONS.md`, `docs/architecture/*`.
- **Dependencies affected:** none.
- **Risks:** agents follow the stale doc during migration.
- **Tests required:** none.
- **Rollback:** revert.
- **Expected outcome:** one source of truth before code moves.

### Step 1.1 — Group `organization` + `member` + `invitation` into `modules/workspace`

- **Current state:** three modules; `invitation` imports `member` internals (`member-errors`, `member-roles`, `member-repository`) and `organization` repository; `organization` imports `document/domain/storage-provider` (3 files).
- **Target state:** `modules/workspace/{organization,members,invitations}/` with `workspace/index.ts` re-exporting the **same names**; `StorageProvider` interface moved to `platform/storage/storage-provider.ts` (documents and workspace both import it from there).
- **Files/modules affected:** `packages/core/src/modules/{organization,member,invitation}/**` (git mv), `packages/core/src/index.ts`, `modules/document/domain/storage-provider.ts` → `platform/storage/`, imports in `document/*`, `policy/application/ensure-policy-pdf.ts`.
- **Dependencies affected:** `organization → document` edge removed; `invitation → member` becomes intra-module. Apps unchanged (root barrel).
- **Risks:** path churn breaking spec imports; tsyringe string tokens unaffected.
- **Tests required:** existing specs (`accept-invitation`, `create-invitation`, `update-member-role`, `deactivate-member`, `get/update-organization`, `upload-organization-logo`) pass unmodified except import paths.
- **Rollback:** revert (pure move).
- **Expected outcome:** one workspace module; −1 accidental cross-module edge.

### Step 1.2 — Move Better Auth orchestration out of routes into `@repo/auth`

- **Current state:** routes call Better Auth directly and also write identity tables: `routes/v1/invitations/_better-auth-helpers.ts` (`signUpEmail`, `signInEmail`, `setActiveOrganization`, `getSession`, plus `prisma.user.update`), `_invitation-auth.ts`, `accept-invitation.ts`, `onboarding/complete.ts` (`auth.api.createOrganization`).
- **Target state:** `packages/auth/src/identity-service.ts` exposing `signUpAndSignIn`, `signInExisting`, `setActiveOrganization`, `createOrganizationForUser`, `readSession` — framework-agnostic (takes `Headers`, returns result + `Set-Cookie` headers). Routes only translate Fastify ↔ service. The `prisma.user.update` moves with it (auth package already depends on `@repo/db`).
- **Files/modules affected:** `packages/auth/src/identity-service.ts` (new), `packages/auth/package.json` exports, the 4 route files above, `apps/server/src/routes/v1/invitations/_better-auth-helpers.ts` (deleted at end).
- **Dependencies affected:** `apps/server/routes → better-auth` removed; `routes → @repo/auth/identity` added.
- **Risks:** cookie/header forwarding differences break session after invite acceptance (highest-risk item of Phase 1); Better Auth error shapes mapped differently.
- **Tests required:** _before moving_, route specs for accept-invitation (new user, existing user, wrong password, expired invitation) and onboarding complete asserting status + `set-cookie` presence; unit specs for `identity-service` with a stubbed `auth.api`; smoke: invite & accept (new + existing user), onboarding.
- **Rollback:** revert; no data or cookie format change.
- **Expected outcome:** Better Auth is touched from one package; routes contain no identity writes.

### Step 1.3 — Membership resolution via workspace query

- **Current state:** `middlewares/tenant-middleware.ts` (`prisma.member.findUnique`) and `middlewares/auth-middleware.ts` (`prisma.user.findUnique`) query identity tables directly on every request.
- **Target state:** `workspace.ResolveMembership({ userId, organizationId })` and `workspace.GetUserStatus(userId)` queries (same SQL, same `prisma` client — **not** `prismaAdmin`, to keep RLS behavior identical); middlewares call them.
- **Files/modules affected:** `modules/workspace/members/application/resolve-membership.ts` (new), `apps/server/src/middlewares/{tenant,auth}-middleware.ts`, `container-registrations.ts`.
- **Dependencies affected:** middlewares lose `@repo/db` (except `createTenantClient` construction, which stays in tenant middleware).
- **Risks:** hot path — an extra DI resolve per request (negligible); accidentally switching to `prismaAdmin` would bypass RLS on the membership lookup.
- **Tests required:** existing `middlewares/__tests__` pass; new spec asserting inactive member → 403, missing member → 403, banned user → 401; spec asserting the query uses the injected non-admin client.
- **Rollback:** revert.
- **Expected outcome:** tenant and auth middleware depend on workspace API only.

### Step 1.4 — Single entitlements access path

- **Current state:** `subscription-middleware.ts` imports `buildEntitlements` from core root and uses `lib/subscription-cache.ts`; `chat-worker/src/messaging/baileys-manager.ts` constructs `new PrismaSubscriptionRepository(prismaAdmin)` + `GetEntitlementsForOrg` itself.
- **Target state:** `billing.GetEntitlementsForOrg` is the only producer (cache-aside inside the use case, same Redis keys from `@repo/shared/billing-cache-constants`). Server middleware calls it. chat-worker calls a new HMAC endpoint `GET /internal/billing/entitlements/:organizationId` (server) — behavior identical, no Prisma in chat-worker for this path.
- **Files/modules affected:** `modules/subscription/application/get-entitlements-for-org.ts`, `apps/server/src/lib/subscription-cache.ts`, `middlewares/subscription-middleware.ts`, `routes/internal/billing/get-entitlements.ts` (new), `apps/chat-worker/src/messaging/baileys-manager.ts`.
- **Dependencies affected:** `chat-worker → @repo/core, @repo/db` removed for entitlements; `chat-worker → server (HMAC)` added.
- **Risks:** chat-worker channel connection now depends on server availability → **fail-open vs fail-closed must match today** (today: DB error throws → connection attempt fails). Use 3 s timeout + reuse last cached value, else same failure as today. Cache invalidation on webhook must still hit the same keys.
- **Tests required:** spec for internal route (HMAC required, org scoping); baileys-manager spec with HTTP fake (allowed / blocked / server down); subscription-middleware specs unchanged (402 for PAST_DUE/EXPIRED, exemptions).
- **Rollback:** revert; deploy chat and server tags together (endpoint must exist before chat-worker uses it → **deploy server first**, chat second; rollback in reverse order).
- **Expected outcome:** one entitlements path; first removal of direct DB access from chat-worker.

---

## Phase 2 — Member directory

**Why:** "who is the salesperson / who gets notified" is resolved in 9+ places with raw queries (D11, S8). Commissions, claims and alerts all depend on it.

### Step 2.1 — Introduce `workspace.MemberDirectory`

- **Current state:** `MemberRepository` (10 methods) mixes admin use cases (`updateRole`, `deactivate`, `listActive`) with directory lookups (`findContactsByRoles`, `findContactByUserId`) and is injected by `claim`, `commission` (2), `invitation`. Role groups hardcoded: `NOTIFY_ROLES = ['OWNER','ADMIN','MANAGER']` in `create-claim.ts`, repeated in 4 alert processors.
- **Target state:** `workspace/members/application/member-directory.ts` (query class, public) with `findRecipientsByRoles(org, roles, excludeUserId?)`, `findContact(org, userId)`, `defaultLeadOwner(org)`, `isActiveMember(org, userId)`; `MANAGEMENT_ROLES` constant in `@repo/auth/roles`. Implemented by delegating to existing repository methods + one new repo method copied **verbatim** from `internal/leads/create-lead.ts:43-45` for `defaultLeadOwner`.
- **Files/modules affected:** new directory file + spec, `packages/auth/src/roles.ts`, `workspace/index.ts`, `container-registrations.ts`.
- **Dependencies affected:** none yet (additive).
- **Risks:** `defaultLeadOwner` semantic drift (filters on `active`, ordering by `createdAt asc`) — must match the route exactly, including the `NO_MEMBER` case.
- **Tests required:** directory spec with repository fake; DB-backed spec for `defaultLeadOwner` ordering (after Step 3.0 harness exists, otherwise local-only and noted in PR).
- **Rollback:** revert (additive).
- **Expected outcome:** one named API for member lookups.

### Step 2.2 — Migrate core consumers

- **Current state:** `claim/application/create-claim.ts`, `commission/application/{approve-commission-admin,reject-commission}.ts`, `invitation/application/create-invitation.ts` inject `MemberRepository`.
- **Target state:** they depend on `MemberDirectory` (invitation keeps `existsActiveByEmail` via directory); `MemberRepository` is no longer exported from `workspace/index.ts` **after** Step 7.1 (still exported now for DI).
- **Files/modules affected:** the 4 use cases + their specs, `container-registrations.ts`.
- **Dependencies affected:** `claim/commission/invitation → member/domain` removed; `→ workspace` public added.
- **Risks:** spec fakes need rewriting — ensure assertions on recipients (exclude acting user) keep the same values.
- **Tests required:** existing specs updated only in fake wiring; assertions unchanged.
- **Rollback:** revert.
- **Expected outcome:** no core module imports another module's repository interface for members.

### Step 2.3 — Migrate edges

- **Current state:** `routes/v1/commissions/approve-admin.ts:45` and `reject-commission.ts:52` do `prisma.user.findUnique` for the salesperson; `routes/internal/leads/create-lead.ts:43` picks the oldest member with `tenantPrisma`; `apps/worker/src/processors/alerts/check-{policy-expiry,proposals-stagnant,commissions-pending,claims-stalled}.ts` run `prismaAdmin.member.findMany` for recipients.
- **Target state:** all use `MemberDirectory`. `create-lead` keeps the rest of its logic for now (moved in Step 3.5). Worker resolves the directory from the core container.
- **Files/modules affected:** 2 commission routes, `create-lead.ts`, 4 alert processors, `apps/worker` container setup.
- **Dependencies affected:** those files lose `@repo/db` member/user queries.
- **Risks:** `create-lead` uses `tenantPrisma` (RLS enforced) whereas directory repos use `prismaAdmin` → isolation relies on `organizationId` WHERE. Directory methods **must** take `organizationId` and have a cross-tenant spec. Alerts run cross-tenant (they iterate orgs) — keep that loop in the processor.
- **Tests required:** route specs for approve/reject asserting notification recipient; worker alert specs (`processors/__tests__`) asserting recipient list and idempotency unchanged; cross-tenant spec for directory.
- **Rollback:** revert.
- **Expected outcome:** zero raw member/user queries outside workspace & auth.

---

## Phase 3 — Sales domain

**Why:** highest business complexity (analysis §6 rank 1) and the source of 4 import cycles.

### Step 3.0 — DB-backed test harness (prerequisite)

- **Current state:** no Postgres in CI; one DB-backed spec.
- **Target state:** `services: postgres:18` in `ci.yml`; `pnpm db:push:dev` (schema + RLS) before tests; `packages/core/test/db-harness.ts` (transaction-per-test rollback, seeded org); vitest project `core:db` with `*.db.spec.ts` naming, runnable locally with `docker compose up -d`.
- **Files/modules affected:** `.github/workflows/ci.yml`, `packages/core/vitest.config.ts`, new harness.
- **Dependencies affected:** CI time (+1–2 min).
- **Risks:** flaky tests from shared DB state → rollback-per-test mandatory; RLS policies must be applied or RLS-related bugs are hidden.
- **Tests required:** port `prisma-client-repository.spec.ts` to the harness as proof.
- **Rollback:** revert workflow change.
- **Expected outcome:** moved queries in Phases 3–6 can be verified against a real schema.

### Step 3.1 — Move `contact`, `proposal`, `policy`, `endorsement` into `modules/sales`

- **Current state:** four sibling modules with cycles `proposal⇄contact`, `proposal⇄policy` (`create-proposal.ts` → `PolicyRepository`, `issue-policy.ts` → `ProposalRepository`, `ContactRepository`, `ClientRepository`, `OnPolicyIssued`).
- **Target state:** `modules/sales/{leads,proposals,policies}/{domain,application,infrastructure}`; `sales/index.ts` re-exports exactly the union of the four old `index.ts` files (same names). Intra-sales imports are allowed; the cycles become intra-module and stop counting.
- **Files/modules affected:** ~70 non-spec files + specs (git mv), `packages/core/src/index.ts`. No change in apps.
- **Dependencies affected:** none externally.
- **Risks:** relative import breakage (typecheck catches); merge conflicts with in-flight work on proposals — schedule when no proposal PRs are open.
- **Tests required:** full `@repo/core` and `@app/server` suites unchanged; `generate:api` zero diff.
- **Rollback:** revert.
- **Expected outcome:** one sales module; cross-module edges from these four drop from 17 to the real external ones (clients, documents, commissions).

### Step 3.2 — Remove type-only borrowing

- **Current state:** `endorsement-repository.ts` and `endorsement-mapper.ts` import `JsonObject` from `occurrence`; `occurrence-repository.ts` imports `JsonValue` type from `policy-repository`.
- **Target state:** `shared-kernel/json.ts` exports `JsonValue`/`JsonObject`; both modules import from it.
- **Files/modules affected:** 3 files + new kernel file.
- **Dependencies affected:** `endorsement(sales) → occurrence` and `occurrence → policy(sales)` removed.
- **Risks:** none (types only).
- **Tests required:** typecheck.
- **Rollback:** revert.
- **Expected outcome:** servicing ↔ sales coupling limited to real behavior.

### Step 3.3 — Deduplicate checklist regeneration (D3)

- **Current state:** the checklist regeneration + auto-detection loop is copy-pasted in `create-proposal.ts:87-107` and `advance-proposal-stage.ts:91-111`.
- **Target state:** internal `proposals/application/sync-stage-checklist.ts` used by both; not exported from `sales/index.ts`.
- **Files/modules affected:** 2 use cases + new internal service + specs.
- **Dependencies affected:** none external.
- **Risks:** subtle ordering difference (items created before/after auto-detect).
- **Tests required:** _first_ characterization specs for both use cases covering each branch (AUTO with CNH already attached, LIFE, ENDORSEMENT starting at QUOTE) asserting created item keys and completion flags; then refactor with specs untouched.
- **Rollback:** revert.
- **Expected outcome:** one place for checklist rules.

### Step 3.4 — Invert documents → proposals

- **Current state:** `document/application/upload-document.ts` injects `AutoCompleteChecklistItems` (sales) and triggers it when `entityType === 'PROPOSAL'`; `contact/promote-contact.ts` also injects it (now intra-sales).
- **Target state:** new `sales.AttachProposalDocument` = `documents.UploadDocument` (without trigger) + `CompleteChecklistByAttachment`. The documents upload route dispatches `entityType === 'PROPOSAL'` to it; other entity types keep `UploadDocument`. HTTP contract unchanged.
- **Files/modules affected:** `document/application/upload-document.ts`, `sales/proposals/application/attach-proposal-document.ts` (new), `apps/server/src/routes/v1/documents/upload-document*.ts`, container registrations.
- **Dependencies affected:** `documents → sales` removed; `sales → documents` (public) added. Cycle gone.
- **Risks:** other callers of `UploadDocument` with `PROPOSAL` (search: chat/internal routes, CSV) would silently lose auto-completion → grep all `UploadDocument` resolutions in the PR; response timing identical (still synchronous).
- **Tests required:** characterization spec: upload `DRIVER_LICENSE` to a proposal completes `driver_license`; upload to CLIENT doesn't touch checklists; route spec for dispatch; smoke: upload CNH on proposal.
- **Rollback:** revert.
- **Expected outcome:** `documents` is a generic attachment store with no domain dependencies.

### Step 3.5 — Lead intake rules into `sales.CaptureLead` (S8, D2)

- **Current state:** `routes/internal/leads/create-lead.ts` (100 lines) dedupes contact by phone, picks owner, creates contact with `consentLgpd: true`, maps TRAVEL→OTHER, creates proposal — using `tenantPrisma` directly.
- **Target state:** `sales/leads/application/capture-lead.ts` with the same steps, calling `CreateContact`, `CreateProposal` and `MemberDirectory.defaultLeadOwner`; route validates HMAC payload and maps result → same response body. Known quirks (S8 owner rule, S14 consent) preserved and documented in the use case header.
- **Files/modules affected:** `create-lead.ts`, new use case + spec, `ContactRepository.findByPhone` (new method, same query).
- **Dependencies affected:** internal route loses `@repo/db`.
- **Risks:** RLS: route used `tenantPrisma`; repos use `prismaAdmin` → cross-tenant spec required; duplicate lead race (two messages at once) — today also non-atomic, keep as is but note.
- **Tests required:** characterization route spec _before_ (existing phone → reuse, new phone → create, NO_MEMBER → error body); use case spec; DB spec for `findByPhone` org scoping; smoke: widget lead capture.
- **Rollback:** revert (chat-worker contract unchanged).
- **Expected outcome:** chat → ERP lead creation runs through the sales domain.

---

## Phase 4 — Sales persistence behind repositories/queries

**Why:** 13 server/worker files read or write sales tables directly; these paths bypass sales rules (D4, D10) and are invisible to future boundary checks.

### Step 4.1 — Narrowed Prisma type for sales

- **Current state:** every repository injects `'PrismaClient'` (18 injections) with access to all delegates.
- **Target state:** `sales/infrastructure/sales-db.ts`: `export type SalesDb = Pick<PrismaClient, 'contact' | 'proposal' | 'proposalChecklistItem' | 'policy' | 'endorsement' | '$transaction'>`; sales repositories type their constructor param as `SalesDb` (same runtime instance). Read-only access to other models needed by existing joins goes through `include` on owned models or is listed explicitly as `SalesReadDb`.
- **Files/modules affected:** sales `infrastructure/*` repositories.
- **Dependencies affected:** compile-time only.
- **Risks:** existing queries that `include` client/insurer data still compile (relations via owned delegates) — acceptable; direct `prisma.client.*` calls inside sales repos will fail to compile and must be listed in the PR (they're reach-through).
- **Tests required:** typecheck; existing specs.
- **Rollback:** revert.
- **Expected outcome:** the compiler reports sales reach-through.

### Step 4.2 — Quote & PDF context queries

- **Current state:** `routes/v1/proposals/send-quote.ts` (contact, organization, user), `generate-proposal-pdf.ts` (organization), `routes/v1/policies/generate-policy-pdf.ts` (client, contact, proposal, organization) query Prisma to build PDF/email input.
- **Target state:** `sales.GetQuoteContext(proposalId, org)` and `sales.GetPolicyDocumentContext(policyId, org)` queries returning typed view models; organization branding via `workspace.GetOrganization` (already cached); routes render PDFs from those models. `pdf-templates/*` untouched.
- **Files/modules affected:** 3 routes, 2 new queries (+ `*.db.spec.ts`), `container-registrations.ts`.
- **Dependencies affected:** 3 routes lose `@repo/db`.
- **Risks:** missing field in view model → blank PDF field (not an error). Visual diff needed.
- **Tests required:** DB specs for both queries (with/without client, with/without insurer); route specs asserting 200 + PDF content-type; golden-file comparison of rendered PDF text for a seeded proposal and policy; smoke: send quote, download policy PDF.
- **Rollback:** revert.
- **Expected outcome:** PDF/quote routes are thin.

### Step 4.3 — Internal chat read/write routes

- **Current state:** `routes/internal/leads/list-proposals.ts`, `list-policies.ts`, `update-client.ts` use `createTenantClient` directly.
- **Target state:** `sales.ListProposalsForContact`, `sales.ListActivePoliciesForClient`, `clients.UpdateClientFromChat` — query implementations **receive the tenant client** (not `prismaAdmin`) to preserve RLS enforcement on internal routes.
- **Files/modules affected:** 3 routes, 3 use cases/queries, repositories.
- **Dependencies affected:** internal routes lose `@repo/db`.
- **Risks:** RLS downgrade if `prismaAdmin` is used by mistake (spec below); response shape drift breaks chat-worker tools (`search-client`, AI prompts).
- **Tests required:** route response snapshot specs _before_ moving; DB specs with RLS enabled proving cross-tenant rows are invisible.
- **Rollback:** revert.
- **Expected outcome:** all `/internal/leads/*` except `create-claim` go through modules.

### Step 4.4 — Worker writes through sales

- **Current state:** `expire-policies-processor.ts:19` `prismaAdmin.policy.updateMany`; `send-quote-email-processor.ts:86` `prismaAdmin.proposal.update` (`sentToClientAt`, D10).
- **Target state:** `sales.ExpireDuePolicies({ now })` (same `updateMany` in repository, returns count) and `sales.MarkQuoteSent({ proposalId, org, sentAt })`. Processors only schedule/call and log.
- **Files/modules affected:** 2 processors, 2 use cases, `PolicyRepository.expireDue`, `ProposalRepository.markQuoteSent`.
- **Dependencies affected:** 2 processors lose `@repo/db` writes.
- **Risks:** `updateMany` semantics (timezone of `endDate < now`) must be identical — pass `now` from processor.
- **Tests required:** DB spec: ACTIVE past end → EXPIRED, CANCELLED untouched, future untouched; processor spec for retries; send-quote-email spec asserting `sentToClientAt` set only after email success.
- **Rollback:** revert (job payloads unchanged).
- **Expected outcome:** no worker writes to sales tables.

### Step 4.5 — CSV policy/client import through modules (D4 relocated, not fixed)

- **Current state:** `csv-import-processor.ts` (304 lines) creates `client`, `contact`, synthetic `proposal(POLICY_ISSUED, NEW_INSURANCE, commission 0)` and `policy` with `prismaAdmin`, skipping `IssuePolicy` rules.
- **Target state:** `clients.ImportClientRow` and `sales.ImportPolicyRow` use cases reproducing the current behavior **exactly** (synthetic proposal, no commission, no address check, skip if policy number exists, oldest contact of client), flagged `origin: 'IMPORT'` in code only (no column). Processor keeps batching, progress and error collection.
- **Files/modules affected:** processor, 2 use cases, `parse-policy-import.ts`/`parse-client-import.ts` (already in core), repositories.
- **Dependencies affected:** processor loses `@repo/db`.
- **Risks:** throughput regression (per-row DI calls); error messages shown in the import UI must be byte-identical (pt-BR strings).
- **Tests required:** characterization spec on the processor with a fixture CSV _before_ moving (created/skipped/failed counts + messages); DB spec for `ImportPolicyRow`; timing check on 5k-row fixture (≤ +20%); smoke: CSV import clients + policies.
- **Rollback:** revert; imports in progress finish with old or new code (same payload).
- **Expected outcome:** policy creation paths are both inside sales, ready for a later D4 fix.

### Step 4.6 — Sales alert queries

- **Current state:** `alerts/check-proposals-stagnant.ts` and `check-policy-expiry.ts` query proposals/policies with `prismaAdmin` and build notification copy (without diacritics, S20).
- **Target state:** `sales.FindStagnantProposals({ now, days: 15 })`, `sales.FindExpiringPolicies({ now, thresholds: [30,15,7] })`; processors keep org iteration, idempotency (`alerts/idempotency.ts`) and copy (S20 fixed later, separately).
- **Files/modules affected:** 2 processors, 2 queries.
- **Dependencies affected:** processors lose proposal/policy queries.
- **Risks:** threshold boundary off-by-one (≤ 7 CRITICAL).
- **Tests required:** DB specs at boundaries (exactly 15 days, 30/15/7 days); existing processor specs.
- **Rollback:** revert.
- **Expected outcome:** sales rules (15-day stagnation, expiry windows) live in sales.

---

## Phase 5 — Commissions & money rules

### Step 5.1 — Money kernel

- **Current state:** `commission-calculator.ts` has its own `BASIS_POINTS_DIVISOR`; CSV import does `Math.round(row.premioReais * 100)`; basis points passed as plain `number`.
- **Target state:** `shared-kernel/money.ts`: branded `Cents`, `BasisPoints`, `applyBasisPoints(cents, bp)`, `reaisToCents(n)`; calculator delegates; CSV import uses `reaisToCents`.
- **Files/modules affected:** new kernel file, `commissions` calculator, `sales.ImportPolicyRow`.
- **Dependencies affected:** none.
- **Risks:** rounding differences (`Math.round` on floats like 0.285 × 100).
- **Tests required:** table-driven specs reproducing current outputs for edge values (x.xx5, negatives for reversals, 0, 10000 bp); calculator spec unchanged.
- **Rollback:** revert.
- **Expected outcome:** one place for money math.

### Step 5.2 — Internal rename of `commissionPercentageInCents` (S4, code only)

- **Current state:** `Proposal.props.commissionPercentageInCents` holds basis points; mapper and API use the same name; `issue-policy.ts:92` maps it to `commissionPercentageInBasisPoints`.
- **Target state:** domain prop `commissionBasisPoints: BasisPoints`; mapper maps to the unchanged DB column; **API response keeps `commissionPercentageInCents`** (presenter alias) so Orval/web are untouched. A DB/API rename is a separate, versioned ticket.
- **Files/modules affected:** `sales/proposals/domain/proposal.ts`, mapper, `issue-policy.ts`, `update-proposal-details.ts`, specs, `routes/v1/proposals/_schemas.ts` presenter.
- **Dependencies affected:** none external.
- **Risks:** missed alias → API field disappears (caught by `generate:api` zero-diff rule).
- **Tests required:** existing specs; `generate:api` zero diff; route spec asserting field present.
- **Rollback:** revert.
- **Expected outcome:** the domain states what the number is.

### Step 5.3 — Commission notifications owned by commissions

- **Current state:** `approve-commission-admin.ts` / `reject-commission.ts` import templates from `notification/infrastructure/email-templates/*`; routes `approve-admin.ts` / `reject-commission.ts` still do part of the recipient work with Prisma (moved to directory in 2.3).
- **Target state:** `commissions/infrastructure/notifications/{commission-approved,commission-rejected}.ts` (moved templates) behind `CommissionNotifier` internal interface; `notifications` exposes only `NotificationDispatcher` + base layout. Routes become validate → use case → audit.
- **Files/modules affected:** 2 use cases, 2 templates (git mv), 2 routes, `notification/index.ts`, container registrations.
- **Dependencies affected:** `commissions → notification/infrastructure` removed; `→ notifications` public kept.
- **Risks:** email HTML changes if the base layout import path changes; in-app notification `type` strings must stay identical (S19 not fixed here).
- **Tests required:** snapshot of rendered email HTML before/after; use case specs asserting dispatch payload (type, recipient, entityId).
- **Rollback:** revert.
- **Expected outcome:** commissions own their copy; notifications is delivery.

### Step 5.4 — Issuance → commission handoff via public command

- **Current state:** `issue-policy.ts` injects `OnPolicyIssued` (commissions application class, not public API) and calls it after `policyRepo.create`; no transaction; a retry after a crash between the two calls leaves a policy without commission, and re-issuing fails on unique policy number.
- **Target state:** `commissions.CreateCommissionForPolicy` (public, **idempotent by `policyId`**: returns existing non-reversal commission if present). `IssuePolicy` calls it. `OnPolicyIssued` deleted. **Optional follow-up (separate PR, additive migration):** partial unique index `commission(policyId) WHERE isReversal = false`, only after a query confirms no duplicates in prod.
- **Files/modules affected:** `sales/policies/application/issue-policy.ts`, `commissions/application/{on-policy-issued → create-commission-for-policy}.ts`, `CommissionRepository.findOriginalByPolicy`, specs, container registrations.
- **Dependencies affected:** `sales → commissions/application` internal import replaced by public API.
- **Risks:** idempotency lookup must ignore reversals; commission rate 0 → no commission (preserve).
- **Tests required:** use case spec (called twice → one commission; rate 0 → none); DB spec for `findOriginalByPolicy`; smoke: issue policy → commission PENDING_COMMERCIAL.
- **Rollback:** revert code; the optional index is dropped with a down migration (no data impact).
- **Expected outcome:** explicit, safe handoff between sales and commissions without events or outbox.

### Step 5.5 — Commission pending alert query

- **Current state:** `alerts/check-commissions-pending.ts` queries `prismaAdmin.commission.findMany`.
- **Target state:** `commissions.FindPendingCommissions({ now, olderThanDays })`; processor keeps loop, idempotency, copy.
- **Files/modules affected:** processor, query.
- **Dependencies affected:** processor loses commission query.
- **Risks:** boundary days.
- **Tests required:** DB spec at boundary; processor spec.
- **Rollback:** revert.
- **Expected outcome:** worker has no raw commission access.

---

## Phase 6 — Remove legacy cross-module dependencies

### Step 6.1 — Servicing module + claim intake (S8/S9 relocated)

- **Current state:** `claim`, `occurrence`, `assistance` separate; `create-claim.ts` imports `notification/infrastructure/email-templates/claim-opened` and hardcodes `NOTIFY_ROLES`; `routes/internal/leads/create-claim.ts` (152 lines, `tenantPrisma`) picks latest-ending active policy, forces URGENT, and returns `dataSaved: true` even when nothing is persisted.
- **Target state:** `modules/servicing/{claims,occurrences,assistance}`; claim template in `servicing/infrastructure/notifications`; recipients via `MemberDirectory` + `MANAGEMENT_ROLES`; `servicing.RegisterClaimFromChat` reproduces the route logic **including the S9 response** (fix is a separate ticket, flagged in code comment and backlog).
- **Files/modules affected:** 3 modules (git mv, first PR), `create-claim.ts`, internal `create-claim.ts` route + new use case (second PR), `sales.ListActivePoliciesForClient` reused.
- **Dependencies affected:** `claim → notification/infrastructure`, `claim → member` removed; internal route loses `@repo/db`.
- **Risks:** same RLS caveat as 4.3 (keep tenant client); chat AI relies on the exact response wording.
- **Tests required:** route response snapshot before; claim number sequence DB spec; smoke: create claim from ERP and chat.
- **Rollback:** revert each PR independently.
- **Expected outcome:** servicing is one module; no templates or role lists outside owners.

### Step 6.2 — Performance module (goal ⇄ dashboard cycle)

- **Current state:** `goal/get-goals-progress-by-year.ts` → `dashboard/domain/dashboard-repository`; `prisma-dashboard-repository.ts` → `goal/domain/goal.isGoalBoardType`.
- **Target state:** `modules/performance/{goals,dashboard}` sharing one internal domain; `performance/infrastructure` gets `PerformanceReadDb = Pick<PrismaClient, read methods of proposal|policy|claim|commission|assistance|goal>` (read-only typed) + write access to `goal` only.
- **Files/modules affected:** 2 modules (git mv) + read-db type.
- **Dependencies affected:** cycle removed.
- **Risks:** none beyond moves; the read-only type may reveal hidden writes (none expected).
- **Tests required:** existing specs; DB spec for realized premium by month (`prisma-dashboard-repository.ts:95-114`).
- **Rollback:** revert.
- **Expected outcome:** no cycles left in core.

### Step 6.3 — Platform services: audit, lookups, storage

- **Current state:** `vehicle-lookup/lookup-vehicle-by-plate.ts` imports `audit/log-audit`; `cep` and `vehicle-lookup` are modules; audit is a module written by 28 server files; LGPD anonymization blanks audit rows inside `prisma-client-repository.ts:229-250` (cross-table write).
- **Target state:** `platform/audit` (`record`, `scrubForClient`, archive), `platform/lookups/{cep,vehicle}`, `platform/storage` (done in 1.1). `clients.LgpdDeleteClient` calls `audit.scrubForClient` explicitly (same order, same effect); the client repository only touches `client`. `compliance/anonymize-client` is created as a thin wrapper around today's behavior (S12 scope expansion is a separate ticket).
- **Files/modules affected:** `modules/{audit,cep,vehicle-lookup}` → `platform/*`, `client` repository + LGPD use case, server `services/audit-logger.ts` import paths.
- **Dependencies affected:** `vehicle-lookup → audit` becomes module → platform (allowed); clients stops writing audit table.
- **Risks:** LGPD delete becomes two statements instead of one method — partial failure possible where previously also non-transactional (0 `$transaction` in core) → wrap both in `prisma.$transaction` (this is a hardening, not a behavior change on success).
- **Tests required:** DB spec: LGPD delete anonymizes client and blanks its audit `before/after`, leaves other clients' audit intact; vehicle lookup still writes audit entry.
- **Rollback:** revert.
- **Expected outcome:** technical concerns out of the module list; single writer for `client` and `audit_log`.

### Step 6.4 — chat-worker leftovers

- **Current state:** `chat-worker/src/ai/record-ai-usage-adapter.ts` constructs `PrismaAiUsageRepository(prismaAdmin)`; `ai-bot-processor.ts` and `tools/capture-lead.ts` import `type ContactSource` from `@repo/db`.
- **Target state:** AI usage recorded by enqueuing `billing.record-ai-usage` (BullMQ, shared Redis) consumed by `apps/worker` calling `billing.RecordAiUsage`; `ContactSource` union exported from `@repo/shared`. chat-worker has **no** `@repo/core` / `@repo/db` dependency (remove from its `package.json` and tsup `noExternal`).
- **Files/modules affected:** adapter, 2 type imports, `apps/worker` new processor, `packages/shared`, chat-worker `package.json` + tsup config.
- **Dependencies affected:** chat-worker ↔ Postgres fully removed.
- **Risks:** usage records become eventually consistent (seconds) → overage calculation at period close could miss in-flight jobs; worker must be deployed **before** chat-worker; queue retention.
- **Tests required:** processor spec (idempotent by message id + hashed chat id); adapter spec enqueue payload; check billing period close job waits/drains queue or accepts lag (document).
- **Rollback:** revert chat-worker first, then worker; jobs left in queue are consumed by the still-deployed worker processor (keep processor for one release after rollback).
- **Expected outcome:** chat deploys independently of the ERP database.

---

## Phase 7 — Enforce module boundaries

### Step 7.1 — Public surface: subpath exports, remove root barrel

- **Current state:** `packages/core/src/index.ts` is `export * from` 23 modules, exporting `Prisma*Repository` and mappers; 131 server files + 3 worker + 2 chat-worker (0 after 6.4) import `@repo/core`; `container-registrations.ts` (564 lines, 123 `register` calls) needs the Prisma classes.
- **Target state:** `package.json` `exports`: `./sales`, `./commissions`, `./servicing`, `./clients`, `./insurers`, `./documents`, `./workspace`, `./billing`, `./notifications`, `./performance`, `./search`, `./compliance`, `./platform`, `./container`; each module exposes `register<Module>(container)` from `./<module>/module`; `index.ts` of each module exports no `Prisma*`, `*Repository`, `*Mapper`. Server `container-registrations.ts` becomes a list of `register*` calls. Root `index.ts` deleted.
- **Files/modules affected:** all module `index.ts`, new `module.ts` per module, `packages/core/package.json`, ~136 app files (codemod: map each imported symbol → subpath), tsup `noExternal` unchanged (`@repo/core` prefix still matches).
- **Dependencies affected:** apps depend on named subpaths.
- **Risks:** large mechanical diff → split into one PR per module (keep root barrel until the last PR); DI registration order dependencies (a use case registered before its repository) → register all modules before resolving anything.
- **Tests required:** full suites; server boot test (resolve every route's use case from the real container once — new spec `container.spec.ts`); smoke flows.
- **Rollback:** revert per-module PR.
- **Expected outcome:** each module's public API is explicit and small.

### Step 7.2 — Import-visible DI tokens

- **Current state:** string tokens (`@inject('ProposalRepository')` ×14, `'PolicyRepository'` ×8, `'PrismaClient'` ×18, …) let any module resolve any other module's internals without importing them.
- **Target state:** repository interfaces become `abstract class` tokens in each module's `domain/`; `@inject(ProposalRepository)`; Prisma client injected through module-specific tokens (`SalesDb`, `CommissionsDb`, …) created in `module.ts`.
- **Files/modules affected:** repository interfaces, use case constructors, `module.ts` files, spec fakes (`implements` → `extends`).
- **Dependencies affected:** cross-module DI now requires an import → visible to lint.
- **Risks:** tsyringe with abstract classes requires `useClass` registrations (no auto-resolution) — covered by `container.spec.ts`.
- **Tests required:** `container.spec.ts`, full suites.
- **Rollback:** revert per module.
- **Expected outcome:** boundary violations can't hide behind strings.

### Step 7.3 — Lint rules (warn → error)

- **Current state:** `config/eslint-config/index.mjs` only enforces `no-explicit-any`, `no-unused-vars`, `no-console`.
- **Target state:**
  - Apps: `no-restricted-imports` bans `@repo/db` in `apps/server/src/routes/**`, `apps/worker/src/processors/**`, `apps/chat-*/**` (allowlist: `tenant-middleware.ts`, `webhooks/asaas` until billing moves, listed with ticket).
  - Core: cross-module imports only through another module's `index.ts`; `shared-kernel` imports nothing; modules may import `platform`, `platform` imports no module; allowed module graph from `context-map.md`. Tooling: evaluate `eslint-plugin-boundaries` (check current API via Context7 before adopting); fallback: generated per-module `no-restricted-imports` blocks.
  - Land in **warn** right after Step 1.0 (baseline count in PR), flip each rule to **error** when its violation count reaches 0.
- **Files/modules affected:** `config/eslint-config/index.mjs`, root `eslint.config.mjs`.
- **Dependencies affected:** new dev dependency (if plugin chosen).
- **Risks:** lint-staged (`eslint --fix`) slows commits; false positives on type-only imports — decide explicitly (type-only cross-module imports also go through `index.ts`).
- **Tests required:** fixture files proving each rule fires (in `config/eslint-config/__fixtures__`), CI `pnpm lint`.
- **Rollback:** revert or downgrade rule to warn.
- **Expected outcome:** new violations fail CI.

### Step 7.4 — Architecture specs and agent docs

- **Current state:** no automated architecture checks; no per-module docs.
- **Target state:** `packages/core/src/architecture.spec.ts` asserting: module `index.ts` exports contain no `Prisma*`/`*Repository`/`*Mapper`; no `@inject('` string literals; each domain module has `CONTEXT.md`. `CONTEXT.md` for `sales`, `commissions`, `servicing`; top-of-file comment in simple modules' `index.ts`. `CLAUDE.md` gets one pointer line; `bens-ddd-module` skill updated to the new layout.
- **Files/modules affected:** spec, 3 `CONTEXT.md`, `docs/architecture/context-map.md`, `CLAUDE.md`, `.claude/skills/bens-ddd-module/`.
- **Dependencies affected:** none.
- **Risks:** docs drift → `architecture.spec.ts` checks that every module listed in `context-map.md` exists and vice versa.
- **Tests required:** the spec itself.
- **Rollback:** revert.
- **Expected outcome:** boundaries are machine-checked and discoverable by agents.

---

## Summary

| Phase                  | PRs (≈)                    | Removes                                                                                                | Highest risk                                                        |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 1 Identity & workspace | 5                          | Better Auth calls in routes; raw member/user queries in middleware; chat-worker entitlements DB access | Session cookies after invite acceptance (1.2); deploy order (1.4)   |
| 2 Member directory     | 3                          | 9 raw member/user lookups; hardcoded role lists                                                        | RLS → app-level scoping in `create-lead` (2.3)                      |
| 3 Sales domain         | 6                          | 3 cycles (proposal⇄contact, proposal⇄policy, proposal⇄document); D3 duplication; lead rules in route   | Silent loss of checklist auto-completion (3.4)                      |
| 4 Sales persistence    | 6                          | 13 direct sales-table accesses in routes/workers                                                       | CSV import behavior/perf parity (4.5); RLS on internal routes (4.3) |
| 5 Money rules          | 5                          | template imports from notification infra; `OnPolicyIssued` coupling; inline money math                 | Rounding parity (5.1)                                               |
| 6 Legacy deps          | 5                          | goal⇄dashboard cycle; claim intake in route; audit cross-writes; chat-worker Postgres access           | AI usage becomes async (6.4)                                        |
| 7 Enforcement          | ~16 (7.1 split per module) | root barrel; string DI tokens; unchecked imports                                                       | Large mechanical diff (7.1)                                         |

**Out of scope (separate tickets after Phase 7, each needs a product decision):** S1 endorsement/renewal issuance · S2 cancellation vs commissions · S3 split · S7 stage vs policy atomicity · S9 fake `dataSaved` · S10 quotas · S12 LGPD scope · S13 self-approval · S14 consent · S15 AI premium overwrite · S19 notification types · S20 diacritics in alerts · member role hierarchy: `UpdateMemberRole` / `DeactivateMember` use `<` (peer ADMIN/MANAGER can demote, deactivate or promote to their own role) while `invitation-policy.assertCanManageRole` uses `<=`; no spec covers the equal-role case (found during Step 1.1 security review) · `packages/conversations` extraction (D5).
