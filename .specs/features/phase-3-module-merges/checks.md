# Phase 3 — Module merges checks

Profile: light
Plan: `.specs/features/phase-3-module-merges/plan.md`

34 checks in 5 slices · 4 one-way doors · 0 open, of which 0 block

## Checks

Grouped by the spec's slices; numbering runs across the whole feature.

### S1 - Merge sales folders (T3.1) · ~70 files · ~90k

**C1** - directories `packages/core/src/modules/contact`, `proposal`, `policy`, and `endorsement` do not exist (SALE-01, AC 1, door 1)
Proof: `node --test --test-name-pattern "old sales module directories are gone" scripts/phase-3-module-merges.test.mjs`

**C2** - directories `packages/core/src/modules/sales/leads`, `sales/proposals`, `sales/policies`, and `sales/policies/endorsement` exist (SALE-01, AC 2, door 1)
Proof: `node --test --test-name-pattern "sales subfolders exist" scripts/phase-3-module-merges.test.mjs`

**C3** - `packages/core/src/modules/sales/index.ts` exports `CreateContact`, `CreateProposal`, `IssuePolicy`, and `CreateEndorsement` (SALE-02, AC 3, door 1)
Proof: `node --test --test-name-pattern "sales index exports the four public use cases" scripts/phase-3-module-merges.test.mjs`

**C4** - `packages/core/src/index.ts` contains `export *` from `./modules/sales/index.js` and does not `export *` from `./modules/contact/index.js`, `./modules/proposal/index.js`, `./modules/policy/index.js`, or `./modules/endorsement/index.js` (SALE-02, AC 4, door 1)
Proof: `node --test --test-name-pattern "core barrel exports sales not the four old modules" scripts/phase-3-module-merges.test.mjs`

**C5** - a TypeScript file under `packages/core/src/modules/sales/proposals` that imports `ContactRepository` resolves under `modules/sales/leads` and the import path does not contain `modules/contact` (SALE-03, AC 5, door 1)
Proof: `node --test --test-name-pattern "proposals import ContactRepository from sales/leads" scripts/phase-3-module-merges.test.mjs`

**C6** - a TypeScript file under `packages/core/src/modules/sales/policies` excluding `endorsement/` that imports `ProposalRepository` resolves under `modules/sales/proposals` and the import path does not contain `modules/proposal` (SALE-03, AC 6, door 1)
Proof: `node --test --test-name-pattern "policies import ProposalRepository from sales/proposals" scripts/phase-3-module-merges.test.mjs`

**C7** - `pnpm --filter @repo/core test` exits 0 (SALE-04, AC 7)
Proof: `node --test --test-name-pattern "core test suite exits 0" scripts/phase-3-module-merges.test.mjs`

**C8** - `operationId` values `getProposal`, `createProposal`, `issuePolicy`, `createContact`, and `createEndorsement` stay on the same method and URL as today (HTTP-01, AC 8)
Proof: `node --test --test-name-pattern "sales operationIds stay on the same method and URL" scripts/phase-3-module-merges.test.mjs`

**C9** - `packages/core/src/modules/sales/proposals/application/create-proposal.ts` still contains `@injectable` or `from 'tsyringe'` (SALE-04, AC 9)
Proof: `node --test --test-name-pattern "create-proposal.ts still uses tsyringe" scripts/phase-3-module-merges.test.mjs`

**C10** - `docs/architecture/forbidden-deps.md` does not list `proposal⇄contact` or `proposal⇄policy` as live cross-module hotspots and still lists `proposal⇄document` as clearing at T4.2 (SALE-05, AC 10)
Proof: `node --test --test-name-pattern "forbidden-deps drops sales cycles and keeps proposal document" scripts/phase-3-module-merges.test.mjs`

### S2 - Shared JSON types (T3.2) · ~5 files · ~10k

**C11** - `packages/core/src/shared-kernel/json.ts` exports the types `JsonValue` and `JsonObject` (JSON-01, AC 11, door 2)
Proof: `node --test --test-name-pattern "shared-kernel json exports JsonValue and JsonObject" scripts/phase-3-module-merges.test.mjs`

**C12** - files under `packages/core/src/modules/sales/policies/endorsement` do not import from a path matching `occurrence` (JSON-01, AC 12, door 2)
Proof: `node --test --test-name-pattern "endorsement does not import occurrence" scripts/phase-3-module-merges.test.mjs`

**C13** - occurrence source files do not import `JsonValue` from a policy or sales path (JSON-01, AC 13, door 2)
Proof: `node --test --test-name-pattern "occurrence does not import JsonValue from policy or sales" scripts/phase-3-module-merges.test.mjs`

**C14** - `packages/core/src/modules/sales/policies/domain/policy-repository.ts` imports `JsonValue` from a path that ends at `shared-kernel/json` and does not declare `export type JsonValue` (JSON-01, AC 14, door 2)
Proof: `node --test --test-name-pattern "policy-repository imports JsonValue from shared-kernel" scripts/phase-3-module-merges.test.mjs`

### S3 - Merge servicing (T3.3) · ~35 files · ~40k

**C15** - directories `packages/core/src/modules/claim`, `occurrence`, and `assistance` do not exist (SERV-01, AC 15, door 3)
Proof: `node --test --test-name-pattern "old servicing module directories are gone" scripts/phase-3-module-merges.test.mjs`

**C16** - directories `packages/core/src/modules/servicing/claims`, `servicing/occurrences`, and `servicing/assistance` exist (SERV-01, AC 16, door 3)
Proof: `node --test --test-name-pattern "servicing subfolders exist" scripts/phase-3-module-merges.test.mjs`

**C17** - `packages/core/src/modules/servicing/index.ts` exports `CreateClaim`, `CreateOccurrence`, and `CreateAssistance` (SERV-01, AC 17, door 3)
Proof: `node --test --test-name-pattern "servicing index exports the three public use cases" scripts/phase-3-module-merges.test.mjs`

**C18** - `packages/core/src/index.ts` contains `export *` from `./modules/servicing/index.js` and does not `export *` from `./modules/claim/index.js`, `./modules/occurrence/index.js`, or `./modules/assistance/index.js` (SERV-01, AC 18, door 3)
Proof: `node --test --test-name-pattern "core barrel exports servicing not the three old modules" scripts/phase-3-module-merges.test.mjs`

**C19** - `create-occurrence.ts` imports `ClaimRepository` from a path under `modules/servicing/claims` (SERV-02, AC 19, door 3)
Proof: `node --test --test-name-pattern "create-occurrence imports ClaimRepository from servicing/claims" scripts/phase-3-module-merges.test.mjs`

**C20** - `pnpm --filter @repo/core test` exits 0 after the servicing merge (SERV-02, AC 20)
Proof: `node --test --test-name-pattern "core test suite exits 0" scripts/phase-3-module-merges.test.mjs`

### S4 - Merge performance, billing, platform (T3.4) · ~50 files · ~50k

**C21** - `packages/core/src/modules/goal` and `modules/dashboard` do not exist; `modules/performance/goals` and `modules/performance/dashboard` exist (MERG-01, AC 21)
Proof: `node --test --test-name-pattern "performance subfolders exist and old goal dashboard dirs are gone" scripts/phase-3-module-merges.test.mjs`

**C22** - `packages/core/src/modules/subscription` and `modules/ai-usage` do not exist; `modules/billing/subscription` and `modules/billing/ai-usage` exist (MERG-01, AC 22)
Proof: `node --test --test-name-pattern "billing subfolders exist and old subscription ai-usage dirs are gone" scripts/phase-3-module-merges.test.mjs`

**C23** - `packages/core/src/modules/audit`, `modules/cep`, and `modules/vehicle-lookup` do not exist; `packages/core/src/platform/audit`, `platform/lookups/cep`, and `platform/lookups/vehicle` exist (MERG-01, AC 23, door 4)
Proof: `node --test --test-name-pattern "platform audit and lookups exist and old dirs are gone" scripts/phase-3-module-merges.test.mjs`

**C24** - `packages/core/src/index.ts` `export *`s from `./modules/performance/index.js`, `./modules/billing/index.js`, and platform entry points, and does not `export *` from the seven old module paths (MERG-01, AC 24, door 4)
Proof: `node --test --test-name-pattern "core barrel exports performance billing platform not the seven old modules" scripts/phase-3-module-merges.test.mjs`

**C25** - files under `packages/core/src/modules/performance/goals` that import dashboard resolve under `modules/performance/dashboard` and not `modules/dashboard` (MERG-02, AC 25)
Proof: `node --test --test-name-pattern "goals import dashboard from performance/dashboard" scripts/phase-3-module-merges.test.mjs`

**C26** - `docs/architecture/forbidden-deps.md` does not list `goal⇄dashboard` as a live cross-module hotspot (MERG-02, AC 26)
Proof: `node --test --test-name-pattern "forbidden-deps drops goal dashboard cycle" scripts/phase-3-module-merges.test.mjs`

**C27** - directory `packages/core/src/platform/storage` exists (MERG-02, AC 27, door 4)
Proof: `node --test --test-name-pattern "platform storage directory still exists" scripts/phase-3-module-merges.test.mjs`

**C28** - `pnpm --filter @repo/core test` exits 0 after the performance billing platform merge (MERG-02, AC 28)
Proof: `node --test --test-name-pattern "core test suite exits 0" scripts/phase-3-module-merges.test.mjs`

### S5 - Deduplicate proposal checklist sync (T3.5) · ~5 files · ~15k

**C29** - `packages/core/src/modules/sales/proposals/application/sync-stage-checklist.ts` exists and is not exported from `packages/core/src/modules/sales/index.ts` (CHK-01, AC 29)
Proof: `node --test --test-name-pattern "sync-stage-checklist exists and is not on sales index" scripts/phase-3-module-merges.test.mjs`

**C30** - `CreateProposal.execute` calls the helper in `sync-stage-checklist.ts` rather than inlining `checklistRepo.createMany` of `{ itemKey, label, isRequired }` (CHK-01, AC 30)
Proof: `node --test --test-name-pattern "create-proposal calls sync-stage-checklist" scripts/phase-3-module-merges.test.mjs`

**C31** - `AdvanceProposalStage` calls that same helper when regenerating checklist items (CHK-01, AC 31)
Proof: `node --test --test-name-pattern "advance-proposal-stage calls sync-stage-checklist" scripts/phase-3-module-merges.test.mjs`

**C32** - the helper invokes auto-complete for `client_data`, `driver_license`, and `vehicle_registration` in that order (CHK-02, AC 32)
Proof: `node --test --test-name-pattern "sync-stage-checklist auto-detect keys stay in order" scripts/phase-3-module-merges.test.mjs`

**C33** - create-proposal with config items `[{ itemKey: 'client_data', label: 'Dados do cliente', isRequired: true }]` calls `checklistRepo.createMany` with that `itemKey`, `label`, and `isRequired` (CHK-02, AC 33)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/application/create-proposal.spec.ts -t "createMany is called with client_data Dados do cliente isRequired true"`

**C34** - `sync-stage-checklist.ts` is not a named export of `@repo/core` (CHK-01, AC 34)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/application/sync-stage-checklist.spec.ts -t "sync-stage-checklist is not exported from @repo/core"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| Landing doors (4) | sales folders C1, C2 · shared-kernel json C11, C14 · servicing folders C15, C16 · platform sibling C23, C27 | - |
| old sales directories gone (4) | C1, table-driven over all 4 | - |
| sales subfolders present (4) | C2, table-driven over all 4 | - |
| sales public use case names (4) | C3, table-driven over all 4 | - |
| dropped core barrel sales paths (4) | C4, table-driven over all 4 | - |
| frozen `operationId` + method + URL (5) | C8, table-driven over all 5 | - |
| JSON types in shared-kernel (2) | `JsonValue` C11 · `JsonObject` C11 | - |
| old servicing directories gone (3) | C15, table-driven over all 3 | - |
| servicing subfolders present (3) | C16, table-driven over all 3 | - |
| servicing public use case names (3) | C17, table-driven over all 3 | - |
| dropped core barrel servicing paths (3) | C18, table-driven over all 3 | - |
| old performance/billing/platform dirs gone (7) | C21, C22, C23, table-driven over all 7 | - |
| checklist auto-detect keys (3) | `client_data` C32 · `driver_license` C32 · `vehicle_registration` C32 | - |

- Claims naming a file path or package export: C3, C4, C9, C11, C14, C17, C18, C24, C29, C34 - each has a proof that reads that file or imports the package
- Claims naming a Vitest example: C33, C34 - each has a proof that names that example
- No other check claims more than the single case its proof exercises

## Swept

- validation: C3, C8, C11
- failure modes: C7, C20, C28
- idempotency: n/a - git mv and an unexported helper; no new write path or duplicate key
- authorization: existing - `requireAbility` on the frozen v1 sales routes is unchanged (HTTP frozen)
- concurrency: n/a - no concurrent compose or write introduced
- data lifecycle: n/a - no stored-data shape change
- dependency failure: n/a - no new external I/O
- state transitions: n/a - no state machine in this phase (T8.5 later)
- observability: n/a - auto-detect warn logs stay as they are; no new metric

## Handoff

Intended split, with the arithmetic, written before any code:

- S1+S2 (sales git mv + json kernel + barrels + forbidden-deps) ≈ 90k. S3 (servicing) ≈ 40k. S4 (performance/billing/platform) ≈ 50k. S5 (checklist helper) ≈ 15k. Combined under 150k. One builder, four commits matching the plan PRs. No hand-off.
