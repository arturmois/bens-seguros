# Idempotency P2 Audit — 2026-04-11

**Branch:** audit/idempotency-p2
**Date:** 2026-04-11
**Method:** Static analysis via grep + manual handler reading
**Scope:** All `GET` routes under `apps/server/src/routes/v1/`

---

## GET Routes Inventory

| route                                       | handler file                           | classification | notes                                                                                                       |
| ------------------------------------------- | -------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/clients`                       | `clients/list-clients.ts`              | pure-read      | ListClients use case, cursor pagination                                                                     |
| `GET /api/v1/clients/export`                | `clients/export-clients.ts`            | pure-read      | ExportClientsCsv — streams CSV, no writes                                                                   |
| `GET /api/v1/clients/:id`                   | `clients/get-client.ts`                | pure-read      | GetClient use case                                                                                          |
| `GET /api/v1/clients/import/template`       | `clients/import-clients.ts`            | pure-read      | Returns static CSV template string, no DB access                                                            |
| `GET /api/v1/clients/import/:jobId/status`  | `clients/import-clients.ts`            | pure-read      | Reads BullMQ job status from Redis; no DB writes                                                            |
| `GET /api/v1/policies`                      | `policies/list-policies.ts`            | pure-read      | ListPolicies use case                                                                                       |
| `GET /api/v1/policies/export`               | `policies/export-policies.ts`          | pure-read      | ExportPoliciesCsv — streams CSV, no writes                                                                  |
| `GET /api/v1/policies/:id`                  | `policies/get-policy.ts`               | pure-read      | GetPolicy use case                                                                                          |
| `GET /api/v1/policies/import/template`      | `policies/import-policies.ts`          | pure-read      | Returns static CSV template string, no DB access                                                            |
| `GET /api/v1/policies/import/:jobId/status` | `policies/import-policies.ts`          | pure-read      | Reads BullMQ job status from Redis; no DB writes                                                            |
| `GET /api/v1/proposals`                     | `proposals/list-proposals.ts`          | pure-read      | ListProposals use case                                                                                      |
| `GET /api/v1/proposals/export`              | `proposals/export-proposals.ts`        | pure-read      | ExportProposalsCsv — streams CSV, no writes                                                                 |
| `GET /api/v1/proposals/:id`                 | `proposals/get-proposal.ts`            | pure-read      | GetProposal use case                                                                                        |
| `GET /api/v1/proposals/:id/checklist`       | `proposals/get-proposal-checklist.ts`  | pure-read      | ListChecklistItems use case                                                                                 |
| `GET /api/v1/commissions`                   | `commissions/list-commissions.ts`      | pure-read      | ListCommissions use case                                                                                    |
| `GET /api/v1/commissions/export`            | `commissions/export-commissions.ts`    | pure-read      | ExportCommissionsCsv — streams CSV, no writes                                                               |
| `GET /api/v1/commissions/:id`               | `commissions/get-commission.ts`        | pure-read      | GetCommission use case                                                                                      |
| `GET /api/v1/claims`                        | `claims/list-claims.ts`                | pure-read      | ListClaims use case                                                                                         |
| `GET /api/v1/claims/:id`                    | `claims/get-claim.ts`                  | pure-read      | GetClaim use case                                                                                           |
| `GET /api/v1/claims/:id/occurrences`        | `claims/list-occurrences.ts`           | pure-read      | ListOccurrences use case                                                                                    |
| `GET /api/v1/notifications`                 | `notifications/list-notifications.ts`  | pure-read      | ListNotifications use case — reads only, no mark-as-read side effect                                        |
| `GET /api/v1/notifications/unread-count`    | `notifications/get-unread-count.ts`    | pure-read      | CountUnreadNotifications — countUnread() only, no write                                                     |
| `GET /api/v1/notifications/alert-counts`    | `notifications/get-alert-counts.ts`    | pure-read      | CountAlertsByEntityType — countAlertsByEntityType() only, no write                                          |
| `GET /api/v1/documents`                     | `documents/list-documents.ts`          | pure-read      | ListDocuments use case                                                                                      |
| `GET /api/v1/documents/:id/url`             | `documents/get-document-url.ts`        | pure-read      | GetDocumentUrl — findById + getSignedUrl; no writes to DB or storage                                        |
| `GET /api/v1/insurers`                      | `insurers/list-insurers.ts`            | pure-read      | ListInsurers use case; cache.set to Redis on miss (see note 1)                                              |
| `GET /api/v1/members`                       | `members/list-members.ts`              | pure-read      | Direct Prisma findMany; cache.set to Redis on miss (see note 1)                                             |
| `GET /api/v1/organization`                  | `organization/get-organization.ts`     | pure-read      | Direct Prisma findUnique; cache.set to Redis on miss (see note 1); getSignedUrl for logo                    |
| `GET /api/v1/invitations`                   | `invitations/list-invitations.ts`      | pure-read      | Direct Prisma findMany — pending + non-expired invitations                                                  |
| `GET /api/v1/invitations/:id/public`        | `invitations/get-public-invitation.ts` | pure-read      | Unauthenticated; returns invitation metadata + checks if user exists; no writes                             |
| `GET /api/v1/audit-logs`                    | `audit-logs/list-audit-logs.ts`        | pure-read      | Direct Prisma findMany on AuditLog table                                                                    |
| `GET /api/v1/search`                        | `search/global-search.ts`              | pure-read      | Cross-entity findMany across clients, proposals, policies, claims; no writes                                |
| `GET /api/v1/stats/dashboard`               | `stats/get-dashboard-stats.ts`         | pure-read      | 19+ read queries via stats-helpers.ts; cache.set to Redis on miss (see note 1)                              |
| `GET /api/v1/tenants`                       | `tenants/list-tenants.ts`              | pure-read      | Prisma findMany on Member+Organization for authenticated user; no tenant guard needed (cross-org by design) |
| `GET /api/v1/assistances`                   | `assistances/list-assistances.ts`      | pure-read      | ListAssistances use case                                                                                    |
| `GET /api/v1/assistances/:id`               | `assistances/get-assistance.ts`        | pure-read      | GetAssistance use case                                                                                      |
| `GET /api/v1/endorsements`                  | `endorsements/list-endorsements.ts`    | pure-read      | ListEndorsements use case                                                                                   |
| `GET /api/v1/endorsements/:id`              | `endorsements/get-endorsement.ts`      | pure-read      | GetEndorsement use case                                                                                     |

**Total GET routes: 38**

---

## Notes

**Note 1 — Redis cache writes (`cache.set`):**
Several routes (`GET /api/v1/insurers`, `GET /api/v1/members`, `GET /api/v1/organization`, `GET /api/v1/stats/dashboard`) write to Redis cache on cache-miss. This is a transparent, append-only optimization layer:

- It does **not** mutate business domain state (no PostgreSQL writes, no Prisma mutations)
- It is idempotent in effect: calling the route N times with the same input produces the same observable response
- Redis cache entries are keyed by `(organizationId, route)` and expire via TTL (24h / 1h / 60s)
- A repeated request that hits the warm cache skips the write entirely

Conclusion: these routes are classified as **pure-read** for idempotency purposes. The Redis write is a performance side-effect, not a business state mutation. No remediation needed.

---

## Findings

- **Pure-read routes:** 38
- **Read + audit-log routes:** 0
- **Read + metrics routes:** 0
- **Read + write routes:** 0

---

## Non-idempotent Routes Detected

None — all 38 GET routes are idempotent.

The three highest-risk candidates were verified clean:

1. **`GET /api/v1/notifications/unread-count`** — delegates to `CountUnreadNotifications` which calls only `repo.countUnread()`. No mark-as-seen side effect.
2. **`GET /api/v1/notifications/alert-counts`** — delegates to `CountAlertsByEntityType` which calls only `repo.countAlertsByEntityType()`. No state mutation.
3. **`GET /api/v1/stats/dashboard`** — executes 19+ read queries via `buildDashboardData()`; the only write is a Redis `cache.set` for performance caching (classified pure-read per Note 1 above).

---

## Assessment

**ALL_IDEMPOTENT**

Every `GET /api/v1/*` handler in `apps/server/src/routes/v1/` performs only read operations against PostgreSQL (via Prisma use cases or direct queries) and/or Redis cache reads. Cache population writes to Redis are present in 4 routes but do not constitute business state mutations and are transparent to callers. No remediation actions required for this audit cycle.
