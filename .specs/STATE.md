# Project state

## Decisions

ADRs that constrain later features live in `docs/ARCHITECTURE-DECISIONS.md` and `docs/architecture-refactoring-roadmap.md` §10. This table does not duplicate them.

| ID     | Decision                                                                                                                                                    | Rationale                                                    | Status | Date       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ---------- |
| AD-001 | Architecture sequencing and DI live guidance is `docs/architecture-refactoring-roadmap.md` (ADR-2 explicit composition), not abstract-class tsyringe tokens | T0.1 freeze; agents were still copying MOD-1 abstract tokens | active | 2026-09-19 |
| AD-002 | Module DAG is enforced with `dependency-cruiser` starting at `warn`, not `eslint-plugin-boundaries`                                                         | ADR-3; ESLint is being removed (ADR-1)                       | active | 2026-09-19 |
| AD-003 | HMAC internal edges construct per-request use cases via `forTenant(organizationId)` + `createTenantClient`, not boot-time `prismaAdmin`                     | C4 / Phase 4 door 1; T5.6 copies this                        | active | 2026-09-20 |
| AD-004 | CSV `ImportPolicyRow` relocates D4 (synthetic `POLICY_ISSUED` proposal, commission 0) and does not call `IssuePolicy`                                       | Phase 4 door 3; D4 fix is a later task                       | active | 2026-09-20 |
| AD-005 | Money math lives in `shared-kernel/money.ts` (`Cents`/`BasisPoints` aliases, `applyBasisPoints`, `reaisToCents` with `Math.round`). Domain `commissionBasisPoints`; HTTP/Prisma `commissionPercentageInCents` | Phase 5 door 1; T5.4 presenter alias                         | active | 2026-09-20 |
| AD-006 | Public `CreateCommissionForPolicy` is idempotent via `findNonReversalByPolicyId`. Rate `<= 0` → `null`. `IssuePolicy` calls it. `OnPolicyIssued` deleted. No unique index this phase | Phase 5 door 2; T5.3                                         | active | 2026-09-20 |
| AD-007 | Chat entitlements are HMAC `GET /api/internal/billing/entitlements/:organizationId` with 3s abort. Path org ≠ HMAC org → `403 TENANT_MISMATCH`. Fetch failure rejects `connectChannel` | Phase 5 door 3; T5.1 fail-closed                             | active | 2026-09-20 |
| AD-008 | AI usage is ERP queue `erp-record-ai-usage`. chat-worker enqueues computed fields and swallows enqueue errors. Skip insert when non-empty `messageIdHash` already stored. `ContactSource` union lives in `@repo/shared` | Phase 5 door 4; T5.2                                         | active | 2026-09-20 |

## Handoff

**Feature**: phase-5-isolation
**Where**: VERIFY PASS (round 2). Six local commits on `main` (T5.4 → T5.3 → T5.5 → T5.6 → T5.1 → T5.2) plus this specs commit. Not pushed.
**In progress**: none
**Next step**: push / six-PR split only if asked
**Blockers**: none
**Uncommitted**: none after this commit
**Branch**: main (do not push unless asked)
