# Project state

## Decisions

ADRs that constrain later features live in `docs/ARCHITECTURE-DECISIONS.md` and `docs/architecture-refactoring-roadmap.md` §10. This table does not duplicate them.

| ID     | Decision                                                                                                                                                    | Rationale                                                    | Status | Date       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ---------- |
| AD-001 | Architecture sequencing and DI live guidance is `docs/architecture-refactoring-roadmap.md` (ADR-2 explicit composition), not abstract-class tsyringe tokens | T0.1 freeze; agents were still copying MOD-1 abstract tokens | active | 2026-09-19 |
| AD-002 | Module DAG is enforced with `dependency-cruiser` starting at `warn`, not `eslint-plugin-boundaries`                                                         | ADR-3; ESLint is being removed (ADR-1)                       | active | 2026-09-19 |

## Handoff

**Feature**: phase-1-tooling
**Where**: S1+S2 (T1.1 Biome + T1.3 noProcessEnv) implemented; C1-C25 proofs green
**In progress**: S3 (T1.2 Postgres CI + core DB harness)
**Next step**: write postgres-ci proofs from checks, implement T1.2, commit `ci(core): add postgres service and db harness`
**Blockers**: none
**Uncommitted**: S1+S2 tree (Biome) until first commit
**Branch**: main (ahead of origin; do not push unless asked)
