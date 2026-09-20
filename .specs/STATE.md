# Project state

## Decisions

ADRs that constrain later features live in `docs/ARCHITECTURE-DECISIONS.md` and `docs/architecture-refactoring-roadmap.md` §10. This table does not duplicate them.

| ID     | Decision                                                                                                                                                    | Rationale                                                    | Status | Date       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ---------- |
| AD-001 | Architecture sequencing and DI live guidance is `docs/architecture-refactoring-roadmap.md` (ADR-2 explicit composition), not abstract-class tsyringe tokens | T0.1 freeze; agents were still copying MOD-1 abstract tokens | active | 2026-09-19 |
| AD-002 | Module DAG is enforced with `dependency-cruiser` starting at `warn`, not `eslint-plugin-boundaries`                                                         | ADR-3; ESLint is being removed (ADR-1)                       | active | 2026-09-19 |

## Handoff

**Feature**: phase-1-tooling
**Where**: S1–S3 implemented; C1–C38 proofs green at `886343b4` + `c9b4338e`; waiting on independent Verifier
**In progress**: none
**Next step**: orchestrator dispatches Verifier over `a603c91f..HEAD` (or feature base..HEAD); do not push
**Blockers**: none
**Uncommitted**: none
**Branch**: main (ahead of origin; do not push unless asked)
