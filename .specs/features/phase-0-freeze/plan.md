# Phase 0 — Freeze the target

Sources:

- `docs/architecture-refactoring-roadmap.md` §12–§13 T0.1 and T0.2, §8, ADR-2, ADR-3, §14 PR 0 / PR 0b, Recommended first task — what this phase must change
- `docs/ARCHITECTURE-DECISIONS.md` MOD-1 (summary table + section) — current live DI and sequencing text
- `CLAUDE.md` overview Arch line and doc index — current agent entry point
- `docs/architecture/2026-09-13-migration-plan.md` header — still presented as the target sequence
- `docs/architecture/context-map.md` status line — still names the 2026-09-13 plan as the migration path
- Confirmed lesson L-002 — not applicable (no HTTP error bodies in this phase)

## Problem

Agents starting a migration step still read live guidance that tells them to keep tsyringe and to use **abstract class DI tokens**, and to sequence work from `docs/architecture/2026-09-13-migration-plan.md`. The approved target is `docs/architecture-refactoring-roadmap.md` (ADR-2: explicit composition; ADR-3: dependency-cruiser, not eslint-plugin-boundaries). The evidence the roadmap gives: CLAUDE.md Arch still points at `ARCHITECTURE-DECISIONS.md`; MOD-1 still contains the bullet “Tokens de DI são classes abstratas”; the 2026-09-13 plan has no superseded-for-sequencing/DI banner. There is no committed architecture checker, so the coupling the roadmap wants to baseline (`routes/**` → `@repo/db`, core import cycles) is not counted in CI.

When this ships, an agent that opens CLAUDE.md lands on the roadmap first; MOD-1 no longer prescribes abstract-class tokens; the old plan is labelled a move catalogue; CI logs a warn-mode violation count without blocking merge.

## Out of scope

| Excluded                                                                                     | Why                                                                                      |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| T1.1 Biome / T1.3 `process.env` lint                                                         | Phase 1; T0.1 must not mix with a format tsunami                                         |
| T1.2 Postgres in CI                                                                          | Phase 1; independent of the freeze                                                       |
| T2.1 compose `clients` / deleting tsyringe from runtime                                      | Phase 2 / T6.1; this phase only changes guidance and a warn checker                      |
| Flipping cruiser rules to `error`                                                            | T6.3                                                                                     |
| Rewriting the body of `2026-09-13-migration-plan.md` or `2026-09-13-modular-architecture.md` | T0.1: banner / historical only; do not rewrite                                           |
| Updating `context-map.md` module table or allowed DAG                                        | Roadmap: update that map after ADR-2 and ADR-3 land in code                              |
| Rewriting `bens-ddd-module` / `bens-code-reviewer` off `@injectable`                         | T9.1                                                                                     |
| Replacing the CLAUDE.md stack lines that describe current tsyringe usage                     | Those lines describe the live runtime until T6.1                                         |
| PR comments / sticky review bots for cruiser                                                 | T0.2 accepts a CI log count; the workflow already has a sticky comment for quality-gates |
| Event bus, extra packages, Nest, microservices                                               | Roadmap anti-goals                                                                       |

## Assumptions

| Assumption                                             | Chosen default                                                                                                                                                                    | Rationale                                                                                                                                     | Confirmed? |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Phase boundary                                         | T0.1 and T0.2 in this feature, two slices, one PR with two commits                                                                                                                | User asked for the next _phase_; roadmap Phase 0 is both tasks; PR 0 + PR 0b can still be split at review if the diff is noisy                | n          |
| Live guidance set for the “abstract class tokens” grep | `CLAUDE.md` and `docs/ARCHITECTURE-DECISIONS.md` only                                                                                                                             | Those two are the agent entry points linked today; the roadmap may still _name_ the superseded phrase; old plan/design bodies stay historical | n          |
| `context-map.md`                                       | One status-line edit: sequencing source becomes the roadmap; module table and “may import” table untouched                                                                        | Otherwise the map still sends agents into the 2026-09-13 sequence; DAG rewrite is explicitly later                                            | n          |
| Cruiser config file                                    | Root `.dependency-cruiser.cjs` (CommonJS)                                                                                                                                         | T0.2 names that file; CJS avoids ESM loader issues next to `"type": "module"` packages                                                        | n          |
| Rule severity                                          | `warn` on `routes-no-db` and `no-circular`; no `--fail-on-warnings`                                                                                                               | ADR-3: start warn; current tree has many `routes` → `@repo/db` hits and four core cycles, so `error` would fail every PR                      | n          |
| `arch:check` paths                                     | `depcruise --config .dependency-cruiser.cjs apps packages`                                                                                                                        | Covers the two hotspots T0.2 names without scanning `node_modules`/generated output (cruiser `doNotFollow` set while building)                | n          |
| CI placement                                           | New step `Architecture deps (warn)` running `pnpm arch:check` with `continue-on-error: true` in the existing `validate` job, after `pnpm install`, non-blocking like `pnpm audit` | Matches T0.2 and the existing warn-step pattern in `.github/workflows/ci.yml`                                                                 | n          |
| Fixture for `routes-no-db`                             | Spec feeds an isolated tree containing `apps/server/src/routes/canary-forbidden-db-import.ts` that imports `@repo/db`; no canary committed under real routes                      | T0.2 requires a fixture that is _reported_; a committed file in `routes/` would be a new production-adjacent import                           | n          |
| Profile                                                | `light` (repo has no `tlc-spec-lean` declaration)                                                                                                                                 | Skill default; raise to `standard` if you want fault injection on the warn/continue-on-error surface                                          | n          |
| Delivery                                               | Commit 1 = T0.1 docs; commit 2 = T0.2 cruiser + CI + hotspot doc                                                                                                                  | Each commit green and revertable; matches roadmap PR 0 then PR 0b                                                                             | n          |

**Open questions:** none - all resolved or logged above.

## Criteria

Grouped by slice - one observable outcome each, never a layer. Numbering runs across the whole plan.

### S1: Docs freeze (T0.1) (P1)

**Acceptance Criteria**

1. WHEN `CLAUDE.md` is read at the project-overview Arch pointer THEN the system SHALL name `docs/architecture-refactoring-roadmap.md` as that Arch target.
2. The CLAUDE.md doc-index table SHALL contain a row whose path is `docs/architecture-refactoring-roadmap.md`.
3. WHEN the CLAUDE.md skill bullet for `bens-ddd-module` is read THEN the system SHALL tell the reader to follow roadmap ADR-2 (explicit composition) for new modules and SHALL NOT tell the reader to add abstract-class DI tokens.
4. The MOD-1 row of the decision-summary table in `docs/ARCHITECTURE-DECISIONS.md` SHALL mention ADR-2 and explicit composition, and SHALL NOT prescribe abstract-class DI tokens.
5. The MOD-1 Decisão list SHALL replace the bullet “Tokens de DI são classes abstratas (visíveis no import), não strings.” with a bullet that names explicit composition and ADR-2 and SHALL link `docs/architecture-refactoring-roadmap.md`.
6. The MOD-1 Migração section SHALL name `docs/architecture-refactoring-roadmap.md` as the sequence to follow and SHALL NOT present the old seven-phase 2026-09-13 path as the path to execute.
7. IF `CLAUDE.md` or `docs/ARCHITECTURE-DECISIONS.md` contains the phrase `abstract class tokens` or `classes abstratas` THEN that same line SHALL also contain `superseded`.
8. The file `docs/architecture/2026-09-13-migration-plan.md` SHALL start with a banner that states it is superseded for sequencing and DI, remains a catalogue of what to move, and points at `docs/architecture-refactoring-roadmap.md`.
9. WHEN the banner in AC 8 is ignored THEN the remainder of `docs/architecture/2026-09-13-migration-plan.md` SHALL be byte-identical to the pre-change file.
10. The file `docs/architecture/2026-09-13-modular-architecture.md` SHALL be unchanged (empty `git diff` on that path).
11. The status paragraph of `docs/architecture/context-map.md` SHALL name `docs/architecture-refactoring-roadmap.md` as the sequencing source; the module table and the “may import” table SHALL be unchanged.

**Independent test:** `rg` on `CLAUDE.md` and the MOD-1 section; `git diff` on the two historical architecture files (banner-only on the migration plan; zero on the design doc); `git diff` on `context-map.md` limited to the status paragraph.

### S2: dependency-cruiser in warn mode (T0.2) (P1)

**Acceptance Criteria**

12. The root `package.json` SHALL list `dependency-cruiser` under `devDependencies` and SHALL expose script `arch:check` whose command includes `--config .dependency-cruiser.cjs`.
13. The file `.dependency-cruiser.cjs` SHALL export a `forbidden` rule named `routes-no-db` with `severity` equal to `warn`, `from.path` matching `apps/server/src/routes`, and `to.path` matching `@repo/db` or `packages/db`.
14. The file `.dependency-cruiser.cjs` SHALL export a `forbidden` rule named `no-circular` with `severity` equal to `warn` and `to.circular` equal to `true` covering `packages/core/src/modules`.
15. WHEN `pnpm arch:check` runs against the current tree THEN it SHALL print a line matching `violations` and SHALL exit `0`.
16. WHEN a file at `apps/server/src/routes/canary-forbidden-db-import.ts` in an isolated fixture tree contains `import … from '@repo/db'` THEN `depcruise --config .dependency-cruiser.cjs` on that tree SHALL report rule `routes-no-db`.
17. The file `docs/architecture/forbidden-deps.md` SHALL list the hotspot `routes/** → @repo/db` and SHALL name the four core cycles `proposal⇄contact`, `proposal⇄policy`, `proposal⇄document`, `goal⇄dashboard`.
18. The file `.github/workflows/ci.yml` SHALL contain a step whose `run` is `pnpm arch:check` and whose `continue-on-error` is `true`.
19. IF `pnpm arch:check` exits non-zero (invalid config or a future `error` rule) THEN the `validate` job SHALL still run the blocking steps `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
20. The `validate` job SHALL keep `pnpm lint`, `pnpm typecheck`, and `pnpm test` without `continue-on-error`.

**Independent test:** `pnpm arch:check` locally; a spec that runs depcruise on the isolated canary tree; `rg` on `ci.yml` and `forbidden-deps.md`.

## Traceability

| ID        | Slice | Criteria       | Status   |
| --------- | ----- | -------------- | -------- |
| ARCH-01   | S1    | 1, 2, 3        | Verified |
| ARCH-02   | S1    | 4, 5, 6, 7     | Verified |
| ARCH-03   | S1    | 8, 9, 10, 11   | Verified |
| CRUISE-01 | S2    | 12, 13, 14, 15 | Verified |
| CRUISE-02 | S2    | 16             | Verified |
| CRUISE-03 | S2    | 17             | Verified |
| CRUISE-04 | S2    | 18, 19, 20     | Verified |

**ID format:** `CATEGORY-NUMBER`. **Status:** Pending → In checks → Implementing → Verified.

## Observable

| Surface                                       | Decision                                                | Landing                                                                       |
| --------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| document `CLAUDE.md`                          | structure (Arch pointer + doc index + DDD skill bullet) | AC 1, 2, 3                                                                    |
| document `CLAUDE.md`                          | tone / depth                                            | n/a - pointer change only; no new prose chapter                               |
| document `CLAUDE.md`                          | what the reader does next                               | AC 1 - open the roadmap                                                       |
| document `ARCHITECTURE-DECISIONS.md` MOD-1    | structure (summary row + Decisão + Migração)            | AC 4, 5, 6                                                                    |
| document `ARCHITECTURE-DECISIONS.md` MOD-1    | tone / depth                                            | existing - keep pt-BR around the replaced bullet                              |
| document `ARCHITECTURE-DECISIONS.md` MOD-1    | what the reader does next                               | AC 6 - follow the roadmap, not the 7-phase path                               |
| document `2026-09-13-migration-plan.md`       | structure (banner then unchanged body)                  | AC 8, 9                                                                       |
| document `2026-09-13-migration-plan.md`       | tone                                                    | AC 8 - superseded for sequencing and DI                                       |
| document `2026-09-13-migration-plan.md`       | what the reader does next                               | AC 8 - use the roadmap; keep this file as move catalogue                      |
| document `2026-09-13-modular-architecture.md` | structure                                               | AC 10 - no edit                                                               |
| document `context-map.md`                     | structure (status line vs tables)                       | AC 11                                                                         |
| document `forbidden-deps.md`                  | structure                                               | AC 17                                                                         |
| document `forbidden-deps.md`                  | tone / depth                                            | AC 17 - short hotspot list, not a second context map                          |
| document `forbidden-deps.md`                  | what the reader does next                               | existing - later slices shrink the list (T6.3 flips remaining rules to error) |
| command `pnpm arch:check`                     | output format and verbosity                             | AC 15 - default `err` reporter, `violations` count line                       |
| command `pnpm arch:check`                     | flags and defaults                                      | AC 12 - `--config .dependency-cruiser.cjs`; paths `apps packages`             |
| command `pnpm arch:check`                     | exit codes                                              | AC 15 - `0` on warn-only findings                                             |
| command `pnpm arch:check`                     | prints when it fails halfway                            | AC 19 - non-zero from cruiser does not skip blocking CI steps                 |
| command `pnpm arch:check`                     | empty / no-violation output                             | n/a - current tree has violations; zero-violation output is T6.3              |
| CI step `Architecture deps (warn)`            | error shape / codes                                     | AC 18, 19 - `continue-on-error: true`; job still runs lint/typecheck/test     |
| CI step `Architecture deps (warn)`            | who may call it                                         | n/a - GitHub Actions `validate` job only                                      |
| CI step `Architecture deps (warn)`            | versioning                                              | n/a - workflow file, not a published API                                      |
| CI step `Architecture deps (warn)`            | rate limit                                              | n/a - one run per CI job                                                      |
| collection cruiser `forbidden` rules          | grouping criterion                                      | AC 13, 14 - one rule per hotspot class (`routes-no-db`, `no-circular`)        |
| collection cruiser `forbidden` rules          | naming                                                  | AC 13, 14 - those two literal names                                           |
| collection cruiser `forbidden` rules          | ordering                                                | n/a - rule array order does not change matches                                |
| collection cruiser `forbidden` rules          | duplicates                                              | n/a - two names, one each                                                     |
| collection cruiser `forbidden` rules          | exception that does not fit                             | AC 16 - isolated canary tree, not a committed route                           |

## Flow

This reuses the existing `validate` job warn-step pattern (`pnpm audit` / quality-gates `continue-on-error`) instead of a second linter runtime, and reuses MOD-1 / CLAUDE.md as the live entry points instead of adding a new docs package.

1. Agent opens `CLAUDE.md` (exists) - Arch pointer and doc index send them to `docs/architecture-refactoring-roadmap.md`; DDD skill bullet names ADR-2
2. `docs/ARCHITECTURE-DECISIONS.md` MOD-1 (exists) - summary + Decisão + Migração now prescribe explicit composition and the roadmap sequence
3. `docs/architecture/2026-09-13-migration-plan.md` (exists) - superseded banner; body unchanged; `docs/architecture/2026-09-13-modular-architecture.md` (exists) untouched
4. `docs/architecture/context-map.md` (exists) - status line names the roadmap; tables unchanged
5. `dependency-cruiser` (door 1) loaded by `.dependency-cruiser.cjs` (door 2) - warn rules `routes-no-db` and `no-circular`
6. `pnpm arch:check` (new script - placement per root `package.json` conventions) - prints the `violations` count, exits 0
7. Isolated canary tree (new spec - placement) - proves `routes-no-db` fires on `import from '@repo/db'`
8. out: `docs/architecture/forbidden-deps.md` (new doc - placement) lists current hotspots; `.github/workflows/ci.yml` (exists) runs `pnpm arch:check` with `continue-on-error: true` and still runs blocking lint/typecheck/test

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside (no HTTP route; CI and `pnpm arch:check` are command surfaces in Observable)

## Landing

| One-way door                                        | Literal shape                                                                                                                                                                                                                                                                               | Alternative rejected                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Add `dependency-cruiser` as a root toolchain        | Root `package.json` `devDependencies.dependency-cruiser` plus script `arch:check`: `depcruise --config .dependency-cruiser.cjs apps packages`                                                                                                                                               | `eslint-plugin-boundaries` — depends on ESLint, which ADR-1 removes; cannot survive T1.1                                                       |
| Warn-mode architecture rules committed at repo root | `.dependency-cruiser.cjs` `forbidden`: `{ name: "routes-no-db", severity: "warn", from: { path: "^apps/server/src/routes" }, to: { path: "@repo/db\|packages/db" } }` and `{ name: "no-circular", severity: "warn", from: { path: "^packages/core/src/modules" }, to: { circular: true } }` | Start as `severity: "error"` — the current tree already violates both rules, so every PR would go red before any module move                   |
| Live MOD-1 DI rule                                  | Replace the Decisão bullet “Tokens de DI são classes abstratas…” with explicit composition (ADR-2) and a link to `docs/architecture-refactoring-roadmap.md`                                                                                                                                 | Keep abstract-class tokens as the current rule and add a “future” note — agents copy the current rule; that is the failure T0.1 exists to stop |

- Nothing else in this change is hard to reverse (markdown pointers, a CI warn step, a hotspot list)

## Impact

| Front       | What changes                                                                                                                                                                                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain      | existing term: `Tokens de DI` / abstract-class tokens meant “do this in new modules”; live MOD-1 now means explicit composition (ADR-2). Who branches on it today: `.claude/skills/bens-ddd-module/SKILL.md`, `.claude/agents/bens-code-reviewer.md` (still `@injectable` until T9.1), agents reading CLAUDE.md |
| domain      | existing term: “migration plan” as the sequence to execute — `ARCHITECTURE-DECISIONS.md` Migração, `context-map.md` status, CLAUDE.md Arch — now means `docs/architecture-refactoring-roadmap.md`; the 2026-09-13 file is a move catalogue only                                                                 |
| stored data | nothing to migrate                                                                                                                                                                                                                                                                                              |
