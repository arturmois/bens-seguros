# Phase 3 — Module merges verification

**Verdict**: PASS
**Profile**: light
**Diff range**: d45b13d5..HEAD
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Fault injection was not run because profile is light, so a missing Faults injected killed-mutant table is not a forgotten step. Coverage was not recomputed from authority (light). Binding sources were not opened as a required section (standard/ui only).

Proofs re-run in full at HEAD `71b04b79997c1f922da29bb0b610d2541f21752a` by the verifier (not the author's claim):

`node --test --test-reporter spec scripts/phase-3-module-merges.test.mjs`

30 tests, 30 pass, 0 fail. Named patterns as `✔`:

- `old sales module directories are gone`
- `sales subfolders exist`
- `sales index exports the four public use cases`
- `core barrel exports sales not the four old modules`
- `proposals import ContactRepository from sales/leads`
- `policies import ProposalRepository from sales/proposals`
- `core test suite exits 0`
- `sales operationIds stay on the same method and URL`
- `create-proposal.ts still uses tsyringe`
- `forbidden-deps drops sales cycles and keeps proposal document`
- `shared-kernel json exports JsonValue and JsonObject`
- `endorsement does not import occurrence`
- `occurrence does not import JsonValue from policy or sales`
- `policy-repository imports JsonValue from shared-kernel`
- `old servicing module directories are gone`
- `servicing subfolders exist`
- `servicing index exports the three public use cases`
- `core barrel exports servicing not the three old modules`
- `create-occurrence imports ClaimRepository from servicing/claims`
- `performance subfolders exist and old goal dashboard dirs are gone`
- `billing subfolders exist and old subscription ai-usage dirs are gone`
- `platform audit and lookups exist and old dirs are gone`
- `core barrel exports performance billing platform not the seven old modules`
- `goals import dashboard from performance/dashboard`
- `forbidden-deps drops goal dashboard cycle`
- `platform storage directory still exists`
- `sync-stage-checklist exists and is not on sales index`
- `create-proposal calls sync-stage-checklist`
- `advance-proposal-stage calls sync-stage-checklist`
- `sync-stage-checklist auto-detect keys stay in order`

C7, C20 and C28 share `core test suite exits 0` (one `pnpm --filter @repo/core test` spawn, status 0, 7081ms).

`pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/application/create-proposal.spec.ts src/modules/sales/proposals/application/sync-stage-checklist.spec.ts -t "createMany is called with client_data Dados do cliente isRequired true|sync-stage-checklist is not exported from @repo/core" --reporter=verbose`

2 tests, 2 pass, 11 skipped, 0 fail. Names as `✓` (not a passWithNoTests miss):

- `createMany is called with client_data Dados do cliente isRequired true`
- `sync-stage-checklist is not exported from @repo/core`

Proof files sit in `d45b13d5..HEAD` (`scripts/phase-3-module-merges.test.mjs` added; `create-proposal.spec.ts` modified; `sync-stage-checklist.spec.ts` added).

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | old `contact`, `proposal`, `policy`, `endorsement` dirs gone | `✔ old sales module directories are gone` | `scripts/phase-3-module-merges.test.mjs:36` - `assert.equal(isDir(\`packages/core/src/modules/${name}\`), false)` for contact, proposal, policy, endorsement | PASS |
| C2 | sales `leads`, `proposals`, `policies`, `policies/endorsement` exist | `✔ sales subfolders exist` | `scripts/phase-3-module-merges.test.mjs:51` - `assert.equal(isDir(rel), true)` for the four sales paths | PASS |
| C3 | `sales/index.ts` exports `CreateContact`, `CreateProposal`, `IssuePolicy`, `CreateEndorsement` | `✔ sales index exports the four public use cases` | `scripts/phase-3-module-merges.test.mjs:63` - `assert.match(text, new RegExp(name))` for those four names | PASS |
| C4 | core barrel `export *` from sales, not the four old modules | `✔ core barrel exports sales not the four old modules` | `scripts/phase-3-module-merges.test.mjs:69` - `assert.match(text, /export \* from '\.\/modules\/sales\/index\.js'/)` ; `:71` - `assert.doesNotMatch` old `contact` `proposal` `policy` `endorsement` barrels | PASS |
| C5 | proposals import `ContactRepository` from `sales/leads`, not `modules/contact` | `✔ proposals import ContactRepository from sales/leads` | `scripts/phase-3-module-merges.test.mjs:90` - `assert.match(importLine[1], /leads/)` ; `:95` - `assert.doesNotMatch(importLine[1], /modules\/contact/)` | PASS |
| C6 | policies (ex-endorsement) import `ProposalRepository` from `sales/proposals`, not `modules/proposal` | `✔ policies import ProposalRepository from sales/proposals` | `scripts/phase-3-module-merges.test.mjs:116` - `assert.match(importLine[1], /proposals/)` ; `:121` - `assert.doesNotMatch(importLine[1], /modules\/proposal/)` | PASS |
| C7 | `pnpm --filter @repo/core test` exits 0 | `✔ core test suite exits 0` | `scripts/phase-3-module-merges.test.mjs:135` - `assert.equal(result.status, 0, result.stdout + result.stderr)` | PASS |
| C8 | five sales `operationId`s stay on the same method and URL | `✔ sales operationIds stay on the same method and URL` | `scripts/phase-3-module-merges.test.mjs:159` - `assert.match` method; `:160` url; `:161` `operationId` for getProposal, createProposal, issuePolicy, createContact, createEndorsement | PASS |
| C9 | `create-proposal.ts` still uses `@injectable` or tsyringe | `✔ create-proposal.ts still uses tsyringe` | `scripts/phase-3-module-merges.test.mjs:169` - `assert.ok` that text matches `@injectable` or `from 'tsyringe'` | PASS |
| C10 | forbidden-deps drops `proposal⇄contact` and `proposal⇄policy`, keeps `proposal⇄document` at T4.2 | `✔ forbidden-deps drops sales cycles and keeps proposal document` | `scripts/phase-3-module-merges.test.mjs:178` - `assert.doesNotMatch(liveTable, /proposal⇄contact/)` ; `:179` policy; `:180` `assert.match(liveTable, /proposal⇄document/)` ; `:181` `/T4\.2/` | PASS |
| C11 | `shared-kernel/json.ts` exports `JsonValue` and `JsonObject` | `✔ shared-kernel json exports JsonValue and JsonObject` | `scripts/phase-3-module-merges.test.mjs:186` - `assert.match(text, /export type JsonValue/)` ; `:187` `/export type JsonObject/` | PASS |
| C12 | endorsement does not import a path matching `occurrence` | `✔ endorsement does not import occurrence` | `scripts/phase-3-module-merges.test.mjs:194` - `assert.doesNotMatch(text, /from ['"][^'"]*occurrence[^'"]*['"]/)` | PASS |
| C13 | occurrence does not import `JsonValue` from policy or sales | `✔ occurrence does not import JsonValue from policy or sales` | `scripts/phase-3-module-merges.test.mjs:213` - `assert.doesNotMatch(importLine[1], /policy-repository/` or `/sales/)` | PASS |
| C14 | `policy-repository.ts` imports `JsonValue` from `shared-kernel/json` and does not `export type JsonValue` | `✔ policy-repository imports JsonValue from shared-kernel` | `scripts/phase-3-module-merges.test.mjs:229` - `assert.match(importLine[1], /shared-kernel\/json/)` ; `:230` - `assert.doesNotMatch(text, /export type JsonValue/)` | PASS |
| C15 | old `claim`, `occurrence`, `assistance` dirs gone | `✔ old servicing module directories are gone` | `scripts/phase-3-module-merges.test.mjs:235` - `assert.equal(isDir(\`packages/core/src/modules/${name}\`), false)` for claim, occurrence, assistance | PASS |
| C16 | servicing `claims`, `occurrences`, `assistance` exist | `✔ servicing subfolders exist` | `scripts/phase-3-module-merges.test.mjs:249` - `assert.equal(isDir(rel), true)` for the three servicing paths | PASS |
| C17 | `servicing/index.ts` exports `CreateClaim`, `CreateOccurrence`, `CreateAssistance` | `✔ servicing index exports the three public use cases` | `scripts/phase-3-module-merges.test.mjs:256` - `assert.match(text, new RegExp(name))` for those three names | PASS |
| C18 | core barrel `export *` from servicing, not the three old modules | `✔ core barrel exports servicing not the three old modules` | `scripts/phase-3-module-merges.test.mjs:262` - `assert.match(text, /export \* from '\.\/modules\/servicing\/index\.js'/)` ; `:264` - `assert.doesNotMatch` old claim, occurrence, assistance barrels | PASS |
| C19 | `create-occurrence.ts` imports `ClaimRepository` from `servicing/claims` | `✔ create-occurrence imports ClaimRepository from servicing/claims` | `scripts/phase-3-module-merges.test.mjs:280` - `assert.match(importLine[1], /servicing\/claims/` or `claims/)` | PASS |
| C20 | core tests exit 0 after servicing merge | `✔ core test suite exits 0` | `scripts/phase-3-module-merges.test.mjs:135` - `assert.equal(result.status, 0, result.stdout + result.stderr)` (shared with C7 at HEAD) | PASS |
| C21 | `goal` and `dashboard` gone; `performance/goals` and `performance/dashboard` exist | `✔ performance subfolders exist and old goal dashboard dirs are gone` | `scripts/phase-3-module-merges.test.mjs:284` - `assert.equal(isDir('packages/core/src/modules/goal'), false)` ; `:285` dashboard false; `:286` performance/goals true; `:287` performance/dashboard true | PASS |
| C22 | `subscription` and `ai-usage` gone; billing counterparts exist | `✔ billing subfolders exist and old subscription ai-usage dirs are gone` | `scripts/phase-3-module-merges.test.mjs:291` - `assert.equal(isDir('packages/core/src/modules/subscription'), false)` ; `:292` ai-usage false; `:293` billing/subscription true; `:294` billing/ai-usage true | PASS |
| C23 | old audit/cep/vehicle-lookup gone; platform audit and lookups exist | `✔ platform audit and lookups exist and old dirs are gone` | `scripts/phase-3-module-merges.test.mjs:298` - `assert.equal(isDir('packages/core/src/modules/audit'), false)` ; `:299` cep; `:300` vehicle-lookup; `:301` platform/audit true; `:302` lookups/cep true; `:303` lookups/vehicle true | PASS |
| C24 | core barrel exports performance, billing, platform; not the seven old modules | `✔ core barrel exports performance billing platform not the seven old modules` | `scripts/phase-3-module-merges.test.mjs:308` - `assert.match` performance; `:309` billing; `:310` `/export \* from '\.\/platform\//` ; `:320` `assert.doesNotMatch` the seven old barrels | PASS |
| C25 | goals import dashboard from `performance/dashboard`, not `modules/dashboard` | `✔ goals import dashboard from performance/dashboard` | `scripts/phase-3-module-merges.test.mjs:336` - `assert.match(importLine[1], /dashboard/)` ; `:337` - `assert.doesNotMatch(importLine[1], /modules\/dashboard/)` | PASS |
| C26 | forbidden-deps does not list `goal⇄dashboard` as a live hotspot | `✔ forbidden-deps drops goal dashboard cycle` | `scripts/phase-3-module-merges.test.mjs:345` - `assert.doesNotMatch(liveTable, /goal⇄dashboard/)` | PASS |
| C27 | `packages/core/src/platform/storage` still exists | `✔ platform storage directory still exists` | `scripts/phase-3-module-merges.test.mjs:349` - `assert.equal(isDir('packages/core/src/platform/storage'), true)` | PASS |
| C28 | core tests exit 0 after performance/billing/platform merge | `✔ core test suite exits 0` | `scripts/phase-3-module-merges.test.mjs:135` - `assert.equal(result.status, 0, result.stdout + result.stderr)` (shared with C7 at HEAD) | PASS |
| C29 | `sync-stage-checklist.ts` exists and is not on `sales/index.ts` | `✔ sync-stage-checklist exists and is not on sales index` | `scripts/phase-3-module-merges.test.mjs:353` - `assert.equal(existsSync(...sync-stage-checklist.ts), true)` ; `:363` - `assert.doesNotMatch(index, /sync-stage-checklist/)` | PASS |
| C30 | `CreateProposal` calls the helper, not inlined `checklistRepo.createMany` of itemKey/label/isRequired | `✔ create-proposal calls sync-stage-checklist` | `scripts/phase-3-module-merges.test.mjs:370` - `assert.match(text, /sync-stage-checklist/)` ; `:371` - `assert.doesNotMatch` inlined `checklistRepo.createMany` of `itemKey: i.itemKey` | PASS |
| C31 | `AdvanceProposalStage` calls the same helper | `✔ advance-proposal-stage calls sync-stage-checklist` | `scripts/phase-3-module-merges.test.mjs:381` - `assert.match(text, /sync-stage-checklist/)` | PASS |
| C32 | helper auto-detect keys `client_data`, `driver_license`, `vehicle_registration` in that order | `✔ sync-stage-checklist auto-detect keys stay in order` | `scripts/phase-3-module-merges.test.mjs:391` - `assert.ok(client >= 0)` ; `:392` - `assert.ok(driver > client)` ; `:393` - `assert.ok(vehicle > driver)` | PASS |
| C33 | createMany called with `client_data`, `Dados do cliente`, `isRequired: true` | `✓ createMany is called with client_data Dados do cliente isRequired true` | `packages/core/src/modules/sales/proposals/application/create-proposal.spec.ts:448` - `expect(checklistRepo.createMany).toHaveBeenCalledWith(expect.any(String), 'org-1', [{ itemKey: 'client_data', label: 'Dados do cliente', isRequired: true }])` | PASS |
| C34 | `sync-stage-checklist.ts` is not a named export of `@repo/core` | `✓ sync-stage-checklist is not exported from @repo/core` | `packages/core/src/modules/sales/proposals/application/sync-stage-checklist.spec.ts:6` - `expect(Object.hasOwn(core, 'syncStageChecklist')).toBe(false)` ; `:7` - `expect(Object.hasOwn(core, 'SyncStageChecklist')).toBe(false)` | PASS |

## Coverage

n/a - profile light. The Coverage join was not recomputed from authority.

## Faults injected

n/a - profile light. Fault injection was not run because profile is light, so a missing Faults injected killed-mutant table is not a forgotten step.

## Binding sources

n/a - profile light. Binding sources is a ui-only step; a missing section here is not a forgotten one.

## Swept existing

Re-read at HEAD `71b04b79`. The only Swept row that resolves to **existing** is authorization. n/a rows (idempotency, concurrency, data lifecycle, dependency failure, state transitions, observability) are policy the user approved; nothing in the code for them to be wrong about.

| Dimension | Check | Constraint in code | Present |
| --- | --- | --- | --- |
| authorization | existing | `requireAbility` on the frozen v1 sales routes named by C8: `get-proposal.ts:19` `requireAbility('read', 'Proposal')`; `create-proposal.ts:28` `requireAbility('create', 'Proposal')`; `issue-policy.ts:20` `requireAbility('create', 'Policy')`; `create-contact.ts:27` `requireAbility('create', 'Contact')`; `create-endorsement.ts:24` `requireAbility('create', 'Endorsement')` | yes |
| validation | C3 | `packages/core/src/modules/sales/index.ts` still exports the four public use-case names (C3 assertion at `scripts/phase-3-module-merges.test.mjs:63`) | yes |
| validation | C8 | frozen method/url/operationId still on the five route files (C8 assertion at `scripts/phase-3-module-merges.test.mjs:159-161`) | yes |
| validation | C11 | `packages/core/src/shared-kernel/json.ts` exports `JsonValue` and `JsonObject` (C11 assertion at `scripts/phase-3-module-merges.test.mjs:186-187`) | yes |
| failure modes | C7, C20, C28 | core suite spawn asserts `result.status === 0` at `scripts/phase-3-module-merges.test.mjs:135` | yes |

## Gate

`node --test --test-reporter spec scripts/phase-3-module-merges.test.mjs` - 30 passed, 0 failed

`pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/application/create-proposal.spec.ts src/modules/sales/proposals/application/sync-stage-checklist.spec.ts -t "createMany is called with client_data Dados do cliente isRequired true|sync-stage-checklist is not exported from @repo/core" --reporter=verbose` - 2 passed, 11 skipped, 0 failed
