# Project state

## Decisions

ADRs that constrain later features live in `docs/ARCHITECTURE-DECISIONS.md` and `docs/architecture-refactoring-roadmap.md` §10. This table does not duplicate them.

| ID     | Decision                                                                                                                                                    | Rationale                                                    | Status         | Date       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- | ---------- |
| AD-001 | Architecture sequencing and DI live guidance is `docs/architecture-refactoring-roadmap.md` (ADR-2 explicit composition), not abstract-class tsyringe tokens | T0.1 freeze; agents were still copying MOD-1 abstract tokens | pending review | 2026-09-19 |
| AD-002 | Module DAG is enforced with `dependency-cruiser` starting at `warn`, not `eslint-plugin-boundaries`                                                         | ADR-3; ESLint is being removed (ADR-1)                       | pending review | 2026-09-19 |

## Handoff

**Feature**: phase-0-freeze
**Where**: plan written at `.specs/features/phase-0-freeze/plan.md` — no checks, no code
**In progress**: waiting for human review of the plan (tlc-spec-lean gate)
**Next step**: if the plan is approved, write `checks.md` then build T0.1 then T0.2
**Blockers**: human confirmation of the plan (and of the assumed defaults: both T0.1+T0.2 in one feature; `light` profile)
**Uncommitted**: `.specs/features/phase-0-freeze/plan.md`, `.specs/STATE.md`
**Branch**: (not started)
