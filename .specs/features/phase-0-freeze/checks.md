# Phase 0 — Freeze the target checks

Profile: light
Plan: `.specs/features/phase-0-freeze/plan.md`

20 checks in 2 slices · 3 one-way doors · 0 open, of which 0 block

## Checks

Grouped by the spec's slices; numbering runs across the whole feature.

### S1 - Docs freeze (T0.1) · 6 files · ~80 KB · ~20k

**C1** - CLAUDE.md overview Arch pointer names `docs/architecture-refactoring-roadmap.md` (ARCH-01, AC 1)
Proof: `node --test --test-name-pattern "overview Arch pointer" scripts/architecture-guidance.test.mjs`

**C2** - CLAUDE.md doc-index table contains a row for `docs/architecture-refactoring-roadmap.md` (ARCH-01, AC 2)
Proof: `node --test --test-name-pattern "doc-index row" scripts/architecture-guidance.test.mjs`

**C3** - CLAUDE.md `bens-ddd-module` bullet names ADR-2 explicit composition and does not tell the reader to add abstract-class DI tokens (ARCH-01, AC 3)
Proof: `node --test --test-name-pattern "DDD skill bullet" scripts/architecture-guidance.test.mjs`

**C4** - ARCHITECTURE-DECISIONS.md MOD-1 summary-table cell mentions ADR-2 and explicit composition and does not prescribe abstract-class DI tokens (ARCH-02, AC 4)
Proof: `node --test --test-name-pattern "MOD-1 summary row" scripts/architecture-guidance.test.mjs`

**C5** - MOD-1 Decisão replaces the abstract-class-tokens bullet with explicit composition and ADR-2 and links `docs/architecture-refactoring-roadmap.md` (ARCH-02, AC 5, door 3)
Proof: `node --test --test-name-pattern "MOD-1 Decisao bullet" scripts/architecture-guidance.test.mjs`

**C6** - MOD-1 Migração names `docs/architecture-refactoring-roadmap.md` as the sequence to follow and does not present the old seven-phase 2026-09-13 path as the path to execute (ARCH-02, AC 6)
Proof: `node --test --test-name-pattern "MOD-1 Migracao sequence" scripts/architecture-guidance.test.mjs`

**C7** - every line in CLAUDE.md or ARCHITECTURE-DECISIONS.md that contains `abstract class tokens` or `classes abstratas` also contains `superseded` (ARCH-02, AC 7)
Proof: `node --test --test-name-pattern "live guidance phrases" scripts/architecture-guidance.test.mjs`

**C8** - `docs/architecture/2026-09-13-migration-plan.md` starts with a banner stating superseded for sequencing and DI, remains a move catalogue, and points at `docs/architecture-refactoring-roadmap.md` (ARCH-03, AC 8)
Proof: `node --test --test-name-pattern "migration-plan banner" scripts/architecture-guidance.test.mjs`

**C9** - the migration-plan file from the first `# Migration Plan` heading to EOF is byte-identical to the pre-change snapshot (ARCH-03, AC 9)
Proof: `node --test --test-name-pattern "migration-plan body unchanged" scripts/architecture-guidance.test.mjs`

**C10** - `docs/architecture/2026-09-13-modular-architecture.md` sha256 matches the pre-change snapshot (ARCH-03, AC 10)
Proof: `node --test --test-name-pattern "modular-architecture unchanged" scripts/architecture-guidance.test.mjs`

**C11** - `context-map.md` status paragraph names `docs/architecture-refactoring-roadmap.md`; module table and may-import table match the pre-change snapshots (ARCH-03, AC 11)
Proof: `node --test --test-name-pattern "context-map status and tables" scripts/architecture-guidance.test.mjs`

### S2 - dependency-cruiser in warn mode (T0.2) · 5 files · ~40 KB · ~10k

**C12** - root `package.json` lists `dependency-cruiser` in `devDependencies` and script `arch:check` includes `--config .dependency-cruiser.cjs` (CRUISE-01, AC 12, door 1)
Proof: `node --test --test-name-pattern "package.json arch:check" scripts/architecture-cruiser.test.mjs`

**C13** - `.dependency-cruiser.cjs` exports forbidden rule `routes-no-db` with `severity` `warn`, `from.path` matching `apps/server/src/routes`, `to.path` matching `@repo/db` or `packages/db` (CRUISE-01, AC 13, door 2)
Proof: `node --test --test-name-pattern "rule routes-no-db" scripts/architecture-cruiser.test.mjs`

**C14** - `.dependency-cruiser.cjs` exports forbidden rule `no-circular` with `severity` `warn` and `to.circular` true covering `packages/core/src/modules` (CRUISE-01, AC 14, door 2)
Proof: `node --test --test-name-pattern "rule no-circular" scripts/architecture-cruiser.test.mjs`

**C15** - `pnpm arch:check` against the current tree prints a line matching `violations` and exits 0 (CRUISE-01, AC 15)
Proof: `node --test --test-name-pattern "arch:check prints violations" scripts/architecture-cruiser.test.mjs`

**C16** - depcruise with this config on an isolated tree whose `apps/server/src/routes/canary-forbidden-db-import.ts` imports `@repo/db` reports rule `routes-no-db` (CRUISE-02, AC 16)
Proof: `node --test --test-name-pattern "canary reports routes-no-db" scripts/architecture-cruiser.test.mjs`

**C17** - `docs/architecture/forbidden-deps.md` lists `routes/** → @repo/db` and the four core cycles `proposal⇄contact`, `proposal⇄policy`, `proposal⇄document`, `goal⇄dashboard` (CRUISE-03, AC 17)
Proof: `node --test --test-name-pattern "forbidden-deps hotspots" scripts/architecture-cruiser.test.mjs`

**C18** - `.github/workflows/ci.yml` has a step whose `run` is `pnpm arch:check` and `continue-on-error` is `true` (CRUISE-04, AC 18)
Proof: `node --test --test-name-pattern "CI arch:check continue-on-error" scripts/architecture-cruiser.test.mjs`

**C19** - the `validate` job still lists `pnpm lint`, `pnpm typecheck`, and `pnpm test` after the `arch:check` step, so a non-zero `arch:check` does not skip them (CRUISE-04, AC 19)
Proof: `node --test --test-name-pattern "CI blocking steps after arch:check" scripts/architecture-cruiser.test.mjs`

**C20** - the `validate` job steps whose `run` is `pnpm lint`, `pnpm typecheck`, or `pnpm test` do not set `continue-on-error` (CRUISE-04, AC 20)
Proof: `node --test --test-name-pattern "CI blocking steps stay blocking" scripts/architecture-cruiser.test.mjs`

## Coverage

| Set (size)                     | Member -> proof                                                  | Unproven |
| ------------------------------ | ---------------------------------------------------------------- | -------- |
| CLAUDE.md pointers (3)         | Arch C1 · doc-index C2 · DDD skill C3                            | -        |
| MOD-1 live sections (3)        | summary C4 · Decisão C5 · Migração C6                            | -        |
| live guidance files (2)        | C7, table-driven over all 2                                      | -        |
| historical docs (4)            | banner C8 · body C9 · modular-architecture C10 · context-map C11 | -        |
| Landing doors (3)              | cruiser dep C12 · warn rules C13, C14 · MOD-1 DI C5              | -        |
| forbidden rules (2)            | `routes-no-db` C13 · `no-circular` C14                           | -        |
| core cycles in hotspot doc (4) | C17, table-driven over all 4                                     | -        |
| blocking CI steps (3)          | C20, table-driven over all 3                                     | -        |
| arch:check assemblies (2)      | package.json script C12 · CI step C18                            | -        |

- Claims naming a command, exit code or CI step: C12, C15, C16, C18, C19, C20 - each has a proof that reads that file or runs that command
- No other check claims more than the single case its proof exercises

## Swept

- validation: C13, C14
- failure modes: C19
- idempotency: n/a - no retryable write or duplicate key in this phase
- authorization: n/a - no authenticated surface
- concurrency: n/a - no concurrent writers
- data lifecycle: n/a - no persisted feature data
- dependency failure: C19
- state transitions: n/a - no state machine
- observability: C15

## Handoff

Intended split, with the arithmetic, written before any code:

- S1 = ~20k (docs + guidance spec); S2 = ~10k (cruiser config + CI + cruiser spec) → 30k combined, under 150k → one builder, two commits (docs then cruiser), no hand-off

- **Boundary:** C1-C11 closed at `efd9659a`
- **Boundary:** C12-C20 closed at `13404c05`
- **Settled mid-build:** context-map table proof compares `|` rows only (prettier changed surrounding blanks, not the tables); canary tree needs a stub `tsconfig.json` because the committed config points at `tsconfig.json`
- **Abandoned:** none
