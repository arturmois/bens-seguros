# Project state

## Decisions

ADRs that constrain later features live in `docs/ARCHITECTURE-DECISIONS.md` and `docs/architecture-refactoring-roadmap.md` §10. This table does not duplicate them.

| ID     | Decision                                                                                                                                                    | Rationale                                                    | Status | Date       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ---------- |
| AD-001 | Architecture sequencing and DI live guidance is `docs/architecture-refactoring-roadmap.md` (ADR-2 explicit composition), not abstract-class tsyringe tokens | T0.1 freeze; agents were still copying MOD-1 abstract tokens | active | 2026-09-19 |
| AD-002 | Module DAG is enforced with `dependency-cruiser` starting at `warn`, not `eslint-plugin-boundaries`                                                         | ADR-3; ESLint is being removed (ADR-1)                       | active | 2026-09-19 |

## Handoff

**Feature**: phase-2-composition
**Where**: builder finished T2.1–T2.3; proofs C1–C28 green at HEAD
**In progress**: none
**Next step**: orchestrator dispatches Verifier over `25b54315..HEAD` with every check in `.specs/features/phase-2-composition/checks.md`
**Blockers**: none
**Uncommitted**: none after the three slice commits
**Branch**: main (ahead of origin; do not push unless asked)
