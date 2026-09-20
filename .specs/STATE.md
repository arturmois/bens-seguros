# Project state

## Decisions

ADRs that constrain later features live in `docs/ARCHITECTURE-DECISIONS.md` and `docs/architecture-refactoring-roadmap.md` §10. This table does not duplicate them.

| ID     | Decision                                                                                                                                                    | Rationale                                                    | Status | Date       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ---------- |
| AD-001 | Architecture sequencing and DI live guidance is `docs/architecture-refactoring-roadmap.md` (ADR-2 explicit composition), not abstract-class tsyringe tokens | T0.1 freeze; agents were still copying MOD-1 abstract tokens | active | 2026-09-19 |
| AD-002 | Module DAG is enforced with `dependency-cruiser` starting at `warn`, not `eslint-plugin-boundaries`                                                         | ADR-3; ESLint is being removed (ADR-1)                       | active | 2026-09-19 |

## Handoff

**Feature**: phase-3-module-merges
**Where**: Phase 2 verified PASS (C1–C28) at `21ad389c`; Phase 3 `plan.md` written, awaiting human review
**In progress**: `.specs/features/phase-3-module-merges/plan.md`
**Next step**: human confirms or objects to the plan; then write `checks.md` (no code until then)
**Blockers**: none
**Uncommitted**: phase-2 `verification.md` + lessons; phase-3 `plan.md`
**Branch**: main (ahead of origin; do not push unless asked)
