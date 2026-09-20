# Project state

## Decisions

ADRs that constrain later features live in `docs/ARCHITECTURE-DECISIONS.md` and `docs/architecture-refactoring-roadmap.md` §10. This table does not duplicate them.

| ID     | Decision                                                                                                                                                    | Rationale                                                    | Status | Date       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ---------- |
| AD-001 | Architecture sequencing and DI live guidance is `docs/architecture-refactoring-roadmap.md` (ADR-2 explicit composition), not abstract-class tsyringe tokens | T0.1 freeze; agents were still copying MOD-1 abstract tokens | active | 2026-09-19 |
| AD-002 | Module DAG is enforced with `dependency-cruiser` starting at `warn`, not `eslint-plugin-boundaries`                                                         | ADR-3; ESLint is being removed (ADR-1)                       | active | 2026-09-19 |

## Handoff

**Feature**: phase-1-tooling
**Where**: done — verification PASS round 2 at `fdf98130`; report `.specs/features/phase-1-tooling/verification.md`; `validate_verification.py` exit 0
**In progress**: none
**Next step**: push and open two PRs (Biome then Postgres) only if asked; do not start Phase 2 until those land if the roadmap sequencing requires it
**Blockers**: none
**Uncommitted**: verification.md + lessons until this commit
**Branch**: main (ahead of origin; do not push unless asked)
