# mod-1-0-record-architecture Validation

**Date**: 2026-09-13
**Spec**: `.specs/features/mod-1-0-record-architecture/spec.md`
**Diff range**: `a210b4da~1..a210b4da` (single commit `a210b4da docs(architecture): record revised MOD-1 target and module graph`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Result**: PASS (12/12 ACs met; ARCH-12 passes with a formatting note and a spec-precision gap flagged)

---

## Task Completion

| Task                                    | Status  | Notes                                                                                                                                                        |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Step 1.0 (no `tasks.md`; single commit) | ✅ Done | Docs-only. Touches `docs/ARCHITECTURE-DECISIONS.md`, `docs/architecture/context-map.md`, `docs/architecture/2026-09-13-modular-architecture.md` and the spec |

---

## Method

This feature is docs-only, so there are no unit tests. The "tests" are deterministic checks derived from each AC. They live in a scratchpad script (`checks.py`, not committed) and run against the real tree (read-only):

- MOD-1 section = `docs/ARCHITECTURE-DECISIONS.md:1003-1041` (from `## MOD-1` to EOF), plus the summary row at line 412.
- The context map tables in §1, §2 and §3 are parsed into rows. §2 edges are compared **set-equal** to the edges parsed from the spec's "Resulting graph" row, with "every module → platform, shared-kernel" expanded to all 12 modules (37 edges). The check also runs cycle detection (DFS) and confirms the stated topological order agrees with every edge.
- The §1 "Absorve" column is checked against the spec's "Mapping of today's 23 modules" row (23/23).
- The design doc body below the first `---` is compared with the parent commit after normalizing whitespace, table separator rows, `*`→`_` emphasis and `;`.

Run on the real tree: exit 0, every check true.

---

## Spec-Anchored Acceptance Criteria

| AC      | Spec-defined outcome                                                                                                                                   | `file:line` evidence                                                                                                                                                                                                                                                                                                                                                                                                                             | Result                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| ARCH-01 | MOD-1 summary row: modular monolith in `packages/core/src/modules`, direct `index.ts` import, no event bus/outbox; no `contexts/`, "eventos", "outbox" | `docs/ARCHITECTURE-DECISIONS.md:412`: "Monolito modular em `packages/core/src/modules` + `platform` + `shared-kernel`, import direto do `index.ts` do provider, … sem event bus". Regex `contexts/\|evento\|outbox` on the row finds 0 matches (the parent row had "14 contextos em `contexts/` … eventos + outbox")                                                                                                                             | ✅ PASS                                   |
| ARCH-02 | Layout lists `shared-kernel/`, `platform/` and the 12 modules                                                                                          | `docs/ARCHITECTURE-DECISIONS.md:1014` (`shared-kernel/`), `:1015` (`platform/`), `:1016` (all 12 modules in the `modules/` line)                                                                                                                                                                                                                                                                                                                 | ✅ PASS                                   |
| ARCH-03 | Six rules from plan §1                                                                                                                                 | Direct `index.ts` import plus ports only for vendors and chat → ERP (HMAC): `docs/ARCHITECTURE-DECISIONS.md:1018`. No event bus/outbox/UnitOfWork, `prisma.$transaction` only for atomicity: `:1019`. Narrowed `Pick<PrismaClient, …>`: `:1020`. Abstract-class DI tokens: `:1021`. Workspace as ACL over Better Auth: `:1022`. `@repo/auth/entitlements` contract: `:1023`. Each matches `docs/architecture/2026-09-13-migration-plan.md:44-49` | ✅ PASS                                   |
| ARCH-04 | Links `architecture/2026-09-13-migration-plan.md` as the migration path; no old Phase 0–5                                                              | `docs/ARCHITECTURE-DECISIONS.md:1005` (status link) and `:1041` ("7 fases incrementais descritas em [plan]"). Regex `(Fase\|Phase)s?\s*0\|0[–-]5` finds 0 matches in the section                                                                                                                                                                                                                                                                 | ✅ PASS                                   |
| ARCH-05 | No `gateway`/`outbox`/`contexts/`/`handler` as prescriptive rules                                                                                      | Only 3 hits in the section, all negated or historical. `docs/ARCHITECTURE-DECISIONS.md:1009` is history ("A primeira proposta (… eventos e outbox) foi revisada"). `:1019` is a negation ("Sem event bus, sem outbox"). `:1034` is an anti-pattern ("NÃO introduzir gateway, evento de domínio ou outbox"). `contexts/` and `handler`: 0 hits                                                                                                    | ✅ PASS (see note 2)                      |
| ARCH-06 | Module table with location, owned models, absorbed modules; exactly 12 modules + `platform` + `shared-kernel`                                          | `docs/architecture/context-map.md:13-28`: 14 rows, name set equal to the expected set, no duplicates, no empty location/owns/absorbs cell. All 23 current modules sit in the row the spec's mapping requires (e.g. `audit`, `cep`, `vehicle-lookup` in `platform` at `:16`)                                                                                                                                                                      | ✅ PASS                                   |
| ARCH-07 | "Pode importar" edges equal the spec's Resulting graph                                                                                                 | `docs/architecture/context-map.md:38-53` (table) plus `:55` ("Todo módulo pode importar `platform` e `shared-kernel`; `platform` não importa nenhum módulo"): 37 parsed edges, set-equal to the 37 expected, extra = ∅, missing = ∅. The solid edges in the mermaid block at `:57-65` equal the table's module-to-module edges                                                                                                                   | ✅ PASS                                   |
| ARCH-08 | chat-worker → server HMAC (`sales`, `clients`, `servicing`, `billing`); chat-worker → worker BullMQ (`billing`)                                        | `docs/architecture/context-map.md:77` (HTTP + HMAC, module set exactly {sales, clients, servicing, billing}) and `:78` (BullMQ, exactly {billing})                                                                                                                                                                                                                                                                                               | ✅ PASS                                   |
| ARCH-09 | No gateway table, event catalog or cross-context transaction exception table                                                                           | `grep -ciE "outbox\|gateway\|evento" docs/architecture/context-map.md` = 0. No heading or table row matches gateway/event/transação/exceção. Sections at `:9`, `:34` and `:73` are Módulos, Dependências permitidas and Dependências fora de processo only                                                                                                                                                                                       | ✅ PASS                                   |
| ARCH-10 | Allowed synchronous graph is acyclic                                                                                                                   | DFS over the edges of `docs/architecture/context-map.md:38-55` finds 0 cycles. The stated order at `:67` (`notifications` → `workspace` → `commissions` → `clients`, `documents` → `sales` → `servicing`) is consistent with every edge                                                                                                                                                                                                          | ✅ PASS                                   |
| ARCH-11 | Header status reads "superseded by review" and links migration plan §1 and `context-map.md`                                                            | `docs/architecture/2026-09-13-modular-architecture.md:5`: "**Status:** superseded by review. …" links `2026-09-13-migration-plan.md#1-target-approved-revised-map` (the anchor heading exists at `docs/architecture/2026-09-13-migration-plan.md:28`) and `context-map.md`                                                                                                                                                                       | ✅ PASS                                   |
| ARCH-12 | Body below header unchanged                                                                                                                            | After normalization, the body equals the parent. `git diff -w a210b4da~1 a210b4da` on the design doc changes only line 5 as content. Every other hunk is formatting (see note 1)                                                                                                                                                                                                                                                                 | ✅ PASS with note / ⚠️ Spec-precision gap |

**Status**: ✅ All ACs covered. ⚠️ 1 spec-precision gap flagged (ARCH-12 independent test).

### Note 1: ARCH-12 is formatting-only (PASS with note), and the spec is imprecise

The raw diff of the design doc is 224 lines. Besides the status line (`:5`), `git diff -w` shows only formatting:

- Table separator rows re-aligned (`|---|---|` → padded dashes).
- Emphasis normalized from `*x*` to `_x_` (`renewal & endorsement _requests_`, `_(package)_`, `cross-_app_`, and the `CLAUDE.md gets one line: _"…"_` sentence).
- The TypeScript interface example inside a fenced block re-wrapped by Prettier (one-line object types split across lines, `;` dropped, `{ /* … */ }` expanded).

No word of content was added or removed. The cause is the pre-commit hook: `package.json:31-32` runs lint-staged `"*.{json,md,css}": ["prettier --write"]`. `pnpm exec prettier --check` passes on all three docs.

This is a **spec-precision gap**, not an implementation gap. The spec's Independent Test (`spec.md:88`, "`git diff` on the design doc touches only the header block") cannot hold in this repo, and Success Criteria `spec.md:123` wrongly states "Prettier does not touch `.md` here". The AC intent (no content change below the header) is met.

### Note 2: ARCH-05 independent test wording

`spec.md:55` says hits must be "lines explicitly marked as superseded history (or nothing)". Lines 1019 and 1034 are prohibitions ("Sem …", "NÃO …"), not history. They satisfy the AC ("SHALL NOT contain … as prescriptive rules") but not the literal wording of the independent test. This is minor and needs no fix.

---

## Discrimination Sensor

Scratch copies of the three docs went into a scratchpad dir; the real tree was never edited and `git stash` was not used. For each mutation, the checks ran against the copy and the scratch dir was then deleted. `git status --porcelain` before = after = empty.

| Mutation                          | Target (real-tree location)                                 | Description                                                           | Killed?                                                                   |
| --------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| M1                                | `docs/architecture/context-map.md:51`                       | Add edge `notifications → servicing` (creates cycle)                  | ✅ Killed (ARCH-07, ARCH-10)                                              |
| M2                                | `docs/architecture/context-map.md:21`                       | Drop `insurers` module row                                            | ✅ Killed (ARCH-06)                                                       |
| M3                                | `docs/ARCHITECTURE-DECISIONS.md:1021`                       | Insert rule "Integração entre módulos via outbox transacional."       | ✅ Killed (ARCH-05)                                                       |
| M4                                | `docs/ARCHITECTURE-DECISIONS.md:1005`                       | Remove both migration-plan links                                      | ✅ Killed (ARCH-04)                                                       |
| M5                                | `docs/architecture/2026-09-13-modular-architecture.md:5`    | Status line back to "proposal."                                       | ✅ Killed (ARCH-11)                                                       |
| M6                                | `docs/architecture/2026-09-13-modular-architecture.md` body | Delete "Cancelamento" from a table cell                               | ✅ Killed (ARCH-12)                                                       |
| M7                                | `docs/architecture/context-map.md:68`                       | Add unaccented "revisao"/"migracao"                                   | ✅ Killed (edge: diacritics)                                              |
| M8                                | `docs/architecture/context-map.md:78`                       | Retarget BullMQ row to `apps/web`                                     | ✅ Killed (ARCH-08)                                                       |
| M9                                | `docs/architecture/context-map.md:80`                       | Append "## 4. Gateways" table                                         | ✅ Killed (ARCH-09)                                                       |
| M10                               | `docs/architecture/context-map.md:42`                       | Swap `sales → documents` for `sales → insurers` (same count, acyclic) | ✅ Killed (ARCH-07)                                                       |
| M11                               | `docs/ARCHITECTURE-DECISIONS.md:412`                        | Summary row "sem event bus" → "eventos + outbox"                      | ✅ Killed (ARCH-01)                                                       |
| M12                               | `docs/ARCHITECTURE-DECISIONS.md:1021`                       | Delete abstract-class DI token rule                                   | ✅ Killed (ARCH-03)                                                       |
| M13                               | `docs/ARCHITECTURE-DECISIONS.md:1016`                       | Drop `compliance` from layout                                         | ✅ Killed (ARCH-02)                                                       |
| M14                               | `docs/ARCHITECTURE-DECISIONS.md:1013`                       | Layout path → `packages/core/src/contexts/`                           | ✅ Killed (ARCH-05)                                                       |
| M15                               | `docs/architecture/context-map.md:5`                        | Design-doc link text loses "substituído … histórico"                  | ✅ Killed (edge: design link)                                             |
| M16 (probe of verifier heuristic) | `docs/ARCHITECTURE-DECISIONS.md:1021`                       | Insert "Módulos se comunicam via outbox, sem chamada direta."         | ❌ Survived: the ARCH-05 negation check accepts any line containing "sem" |

**Sensor depth**: lightweight+ (16 mutations; docs-only, not a P0 path)
**Sensor outcome**: 15/15 feature-behavior mutants killed. M16 is a blind spot in the verifier's own ARCH-05 keyword heuristic, not in the feature. It is mitigated because all 3 real ARCH-05 hits (lines 1009, 1019, 1034) were read and classified by hand above. Any future automated ARCH-05 gate (e.g. Step 7.4) should require an explicit negation _of the matched term_, not just a negation word anywhere on the line.

---

## Code Quality

| Principle                                                    | Status                                                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minimum change                                               | ✅ Only the 3 docs named in the spec plus the spec itself                                                                                                               |
| Surgical changes                                             | ✅ Outside MOD-1, `docs/ARCHITECTURE-DECISIONS.md` changes are whitespace-only table re-alignment (`git diff -w -U0` hunks at 395 and 412 only; 395 is a separator row) |
| No scope creep                                               | ✅ Migration plan, `CLAUDE.md`, code and lint untouched (per Out of Scope)                                                                                              |
| Matches patterns                                             | ✅ pt-BR, same ADR section structure (Contexto/Decisão/Regras/Anti-patterns/Migração); Prettier-clean                                                                   |
| Spec-anchored outcome check                                  | ✅ Edge sets, module sets and HMAC/BullMQ module sets compared exactly, not just for presence                                                                           |
| Coverage expectation                                         | ✅ 1:1 check per AC plus 2 edge cases                                                                                                                                   |
| No unclaimed checks                                          | ✅                                                                                                                                                                      |
| Documented guidelines followed: `CLAUDE.md` (language rules) | ✅                                                                                                                                                                      |

---

## Edge Cases

- [x] New pt-BR strings use correct diacritics. An unaccented-word regex (nao, migracao, decisao, modulo, dominio, dependencias, historico, substituido, revisao, topologica, …) finds 0 hits in the MOD-1 section, the summary row and `context-map.md`. The unaccented `Decisao` / `constantes por modulo` in `git diff` + lines (`docs/ARCHITECTURE-DECISIONS.md:394,398`) are pre-existing text from outside MOD-1, only re-aligned by Prettier (they exist in `a210b4da~1`; `git diff -w` hides them).
- [x] `context-map.md` link to the design doc marks it as superseded rationale: `docs/architecture/context-map.md:5` ("foi substituído pela revisão e serve só como racional histórico"). The same holds for MOD-1 at `docs/ARCHITECTURE-DECISIONS.md:1005`.

---

## Gate Check

- **Gate command**: no `tasks.md`/build gate for a docs-only feature. Substitutes: `python3 checks.py <repo>` (exit 0, 14/14 checks true) and `pnpm exec prettier --check` on the 3 docs (all files use Prettier code style)
- **Test count before/after**: n/a (no code tests touched)
- **Failures**: none

---

## Fix Plans

No blocking fixes. Optional spec hygiene (non-blocking):

### Fix 1: ARCH-12 independent test and Success Criteria contradict the pre-commit hook

- **Root cause**: `spec.md:88` expects a header-only `git diff`, and `spec.md:123` assumes Prettier skips `.md`. `package.json:31-32` formats `*.md` on commit.
- **Fix task**: change the independent test to `git diff -w` / formatting-normalized comparison, and correct the Success Criteria line.
- **Priority**: Minor

---

## Requirement Traceability Update

The Verifier is read-only outside this report, so `spec.md` statuses are left for the orchestrator.

| Requirement       | Previous Status | New Status                         |
| ----------------- | --------------- | ---------------------------------- |
| ARCH-01 … ARCH-11 | Implementing    | ✅ Verified                        |
| ARCH-12           | Implementing    | ✅ Verified (formatting-only note) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 12/12 ACs matched spec outcome; 1 spec-precision gap (ARCH-12 independent test wording)
**Sensor**: 15/15 feature mutants killed; 1 verifier-heuristic probe survived (documented)
**Gate**: 14/14 deterministic checks passed; Prettier check clean

**What works**: MOD-1 row and section describe the revised target; the context map's allowed-import graph matches the spec exactly (37 edges, acyclic); out-of-process edges are exact; no gateway/event/transaction tables; the design doc is marked superseded with working links.

**Issues found**: the spec's ARCH-12 independent test cannot hold under the repo's lint-staged Prettier hook. Fix it by rewording the test to be whitespace/format-insensitive.

**Next steps**: orchestrator flips traceability to Verified; optionally amend `spec.md:88` and `:123`.
