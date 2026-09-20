# Project state

## Decisions

ADRs that constrain later features live in `docs/ARCHITECTURE-DECISIONS.md` and `docs/architecture-refactoring-roadmap.md` §10. This table does not duplicate them.

| ID     | Decision                                                                                                                                                    | Rationale                                                    | Status | Date       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ---------- |
| AD-001 | Architecture sequencing and DI live guidance is `docs/architecture-refactoring-roadmap.md` (ADR-2 explicit composition), not abstract-class tsyringe tokens | T0.1 freeze; agents were still copying MOD-1 abstract tokens | active | 2026-09-19 |
| AD-002 | Module DAG is enforced with `dependency-cruiser` starting at `warn`, not `eslint-plugin-boundaries`                                                         | ADR-3; ESLint is being removed (ADR-1)                       | active | 2026-09-19 |
| AD-003 | HMAC internal edges construct per-request use cases via `forTenant(organizationId)` + `createTenantClient`, not boot-time `prismaAdmin`                     | C4 / Phase 4 door 1; T5.6 copies this                        | active | 2026-09-20 |
| AD-004 | CSV `ImportPolicyRow` relocates D4 (synthetic `POLICY_ISSUED` proposal, commission 0) and does not call `IssuePolicy`                                       | Phase 4 door 3; D4 fix is a later task                       | active | 2026-09-20 |

## Handoff

**Feature**: phase-4-edges
**Where**: S1–S5 closed (C1–C58)
**In progress**: S6 T4.5 CSV C59–C66
**Next step**: characterization fixture then ImportClientRow + ImportPolicyRow (no IssuePolicy)
**Blockers**: none
**Uncommitted**: none
**Branch**: main (do not push unless asked)
