# Validation Report: mod-1-1-workspace-module

**Verdict**: PASS
**Date**: 2026-09-13
**Spec**: `.specs/features/mod-1-1-workspace-module/spec.md`
**Diff range**: `0d5f14bd..92bc54ab` (b77b10d7 StorageProvider -> platform/storage; 92bc54ab organization/member/invitation -> modules/workspace)
**Verifier**: independent sub-agent (author != verifier)

---

## Task Completion

No `tasks.md` exists for this feature (two-commit move refactor delivered directly from spec). Both commits named in the spec's Delivery assumption are present on `main`: `b77b10d7`, `92bc54ab`.

---

## Method

Pure move refactor, so no new behavior tests exist. Evidence comes from (a) the existing `@repo/core` suite and root gates, and (b) a deterministic structural checker written by the verifier, `check_ws.py`, kept in the verifier scratchpad and not committed. The checker reads the new side from the working tree and the base side from git objects at `0d5f14bd`. On `92bc54ab` it printed `RESULT: ALL PASS`, exit 0.

WS-08 does not rely on git rename heuristics. For every base `.ts` file under `packages/core/src`, it maps the file to its new path. It then replaces every module-specifier string (`from`, `import`, `import(`, `vi.mock(`, `require(`) with a placeholder and requires the rest of the text to match byte for byte. It also resolves each relative specifier on both sides and requires the new target to be the mapped equivalent of the old one. `git diff -M --name-status` corroborates this: 43 renames (R080-R100) and 16 in-place modifications, with no unexpected adds or deletes.

---

## Spec-Anchored Acceptance Criteria

| AC    | Spec-defined outcome                                                                              | Evidence (`file:line` + check)                                                                                                                                                                                                                                                                                                                                                                                                                       | Result  |
| ----- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| WS-01 | `platform/storage/storage-provider.ts` has the same `UploadResult`/`StorageProvider` declarations | `packages/core/src/platform/storage/storage-provider.ts:1` `export interface UploadResult`, `:5` `export interface StorageProvider`; checker: file content `==` `git show 0d5f14bd:packages/core/src/modules/document/domain/storage-provider.ts` (byte-identical; git reports R100)                                                                                                                                                                 | ✅ PASS |
| WS-02 | old `document/domain/storage-provider.ts` absent                                                  | checker: `os.path.isfile(...) == False`                                                                                                                                                                                                                                                                                                                                                                                                              | ✅ PASS |
| WS-03 | root barrel still exports types `StorageProvider`, `UploadResult`                                 | `packages/core/src/index.ts:42` `export * from './modules/document/index.js'` -> `packages/core/src/modules/document/index.ts:10-11` `StorageProvider, UploadResult` from `'../../platform/storage/storage-provider.js'` (resolved by checker to the platform file)                                                                                                                                                                                  | ✅ PASS |
| WS-04 | 0 imports containing `/document/` under `modules/workspace`                                       | checker: 0 hits over every `.ts` line under `packages/core/src/modules/workspace/`; workspace files import `'../../../../platform/storage/storage-provider.js'` (e.g. `packages/core/src/modules/workspace/organization/application/update-organization.ts:3`)                                                                                                                                                                                       | ✅ PASS |
| WS-05 | old dirs absent; every non-index file at mapped path, same basename; no sub-folder `index.ts`     | checker: 42/42 non-index base files present at `modules/workspace/{organization,members,invitations}/...`; old dirs absent; `os.walk` finds `index.ts` only at `packages/core/src/modules/workspace/index.ts`                                                                                                                                                                                                                                        | ✅ PASS |
| WS-06 | export-name set of `workspace/index.ts` == union of 3 old indexes (value + type)                  | checker: 66 names == 66 names, `missing=[] extra=[]`, no `export *`; `packages/core/src/modules/workspace/index.ts:1-110`                                                                                                                                                                                                                                                                                                                            | ✅ PASS |
| WS-07 | root barrel has `./modules/workspace/index.js`, no organization/member/invitation lines           | `packages/core/src/index.ts:46` `export * from './modules/workspace/index.js'`; checker regex `modules/(organization\|member\|invitation)\b` -> 0 lines                                                                                                                                                                                                                                                                                              | ✅ PASS |
| WS-08 | moved and importing files differ from `0d5f14bd` only in import/export specifiers                 | checker: 58 touched/moved files equal after specifier normalisation, and every specifier resolves to the mapped base target; `packages/core/src/index.ts` diff is only `-invitation/-member/-organization/+workspace` export-star lines (`:46`); `workspace/index.ts` statements == concatenation of the 3 old index files with rewritten specifiers. No reorder, reformat or identifier changes from the lint-staged `eslint --fix`/`prettier` hook | ✅ PASS |
| WS-09 | `@repo/core` tests: 102 files / 575 tests passed, 0 failed, 0 skipped                             | `pnpm --filter @repo/core exec vitest run`: `Test Files 102 passed (102)`, `Tests 575 passed (575)`, no skipped/todo lines, exit 0. Matches the baseline at `0d5f14bd` (102/575)                                                                                                                                                                                                                                                                     | ✅ PASS |
| WS-10 | `pnpm lint`, `pnpm typecheck`, `pnpm build` exit 0                                                | Re-run with `--force` (turbo cache bypassed): lint `0 cached, 16 total` exit 0; typecheck `0 cached, 16 total` exit 0; build `0 cached, 6 total` exit 0                                                                                                                                                                                                                                                                                              | ✅ PASS |
| WS-11 | no changes under `apps/`                                                                          | `git diff --stat 0d5f14bd 92bc54ab -- apps` -> empty                                                                                                                                                                                                                                                                                                                                                                                                 | ✅ PASS |

**Status**: ✅ All 11 ACs covered with precise, spec-anchored checks. No spec-precision gaps.

**Success criterion (history)**: `git log --follow --oneline -- packages/core/src/modules/workspace/invitations/application/create-invitation.ts` shows `92bc54ab` and the older `b7caf22c refactor(server,core): CreateInvitation use case + InvitationEmailNotifier port (#257)`. History is preserved. ✅

---

## Edge Cases

- [x] External consumers importing moved internals by relative path (`claim/application/create-claim{,.spec}.ts`, `commission/application/{approve-commission-admin,reject-commission}.ts`, `approve-commission.spec.ts`, `reject-commission.spec.ts`, `policy/application/ensure-policy-pdf.ts`): all appear as in-place `M` with specifier-only diffs (WS-08 checker), and each specifier resolves to the moved file.
- [x] Moved files importing `shared/` gain one `../` and resolve to the same file, e.g. `packages/core/src/modules/workspace/organization/application/get-organization.ts:2` `'../../../../shared/cache-aside.js'` -> `packages/core/src/shared/cache-aside.ts` (checked by the WS-08 resolution step).
- [x] Name collisions across the old indexes: none. The 66-name union has no duplicates and typecheck exits 0.

---

## Discrimination Sensor

Scratch: temporary `git worktree add --detach <scratchpad>/wt 92bc54ab`, with its own `pnpm install` and `db:generate`. The unmutated scratch passed the checker, `tsc --noEmit` and vitest (102/575) before any mutation. Each mutant was applied to a clean reset of the scratch. Detectors per mutant: the structural checker, core `tsc --noEmit`, and core vitest.

| #   | Mutation                                                                             | File:line                                                                               | Checker                                            | tsc                 | vitest           | Killed?                   |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------- | ---------------- | ------------------------- |
| 1   | Drop `export { CancelInvitation }`                                                   | `packages/core/src/modules/workspace/index.ts`                                          | FAIL WS-06 (`missing=['CancelInvitation']`), WS-08 | pass                | pass             | ✅ Killed (checker only)  |
| 2   | Add `export { ListMembers as ListMembersAlias }`                                     | `packages/core/src/modules/workspace/index.ts`                                          | FAIL WS-06 (`extra=['ListMembersAlias']`), WS-08   | pass                | pass             | ✅ Killed (checker only)  |
| 3   | Restore `document/domain/storage-provider.ts` and import it from a workspace file    | `packages/core/src/modules/workspace/organization/application/update-organization.ts:3` | FAIL WS-02, WS-04, WS-08                           | pass                | pass             | ✅ Killed (checker only)  |
| 4   | Stale `members/index.ts` (old member index restored)                                 | `packages/core/src/modules/workspace/members/index.ts`                                  | FAIL WS-05                                         | pass                | pass             | ✅ Killed (checker only)  |
| 5   | Statement change `<=` -> `<` in `assertCanManageRole`                                | `packages/core/src/modules/workspace/invitations/domain/invitation-policy.ts:19`        | FAIL WS-08                                         | pass                | pass (575)       | ✅ Killed (checker only)  |
| 6   | Break `shared/` depth (`../../../../shared/cache-aside.js` -> `../../../shared/...`) | `packages/core/src/modules/workspace/organization/application/get-organization.ts:2`    | FAIL WS-08 (unresolved)                            | exit 2 (1 TS error) | exit 1 (570 run) | ✅ Killed (all three)     |
| 7   | Re-add `export * from './modules/member/index.js'` to root barrel                    | `packages/core/src/index.ts:54`                                                         | FAIL WS-07                                         | exit 2 (1 TS error) | pass             | ✅ Killed (checker + tsc) |

**Sensor depth**: expanded (7 mutations, structural P0-style coverage of every AC surface)
**Result**: 7/7 killed - PASS ✅

**Isolation**: real-tree `git status --porcelain` was empty before sensor work and empty after `git worktree remove --force` (only `validation.md` was added afterwards by this report).

**Observation (informational, not a feature gap)**: mutants 1-5 survive `tsc` and the vitest suite. The structural checks are therefore the load-bearing detector for WS-04..WS-08, not the gates. Mutant 5 also shows that the existing suite does not test the equal-role boundary of `assertCanManageRole` (pre-existing behavior, not changed by this feature). A future hardening task could add that test; it is outside this feature's scope.

---

## Code Quality

| Principle                                                                                            | Status                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Minimum code                                                                                         | ✅ (moves + specifier rewrites only)                                                                                       |
| Surgical changes                                                                                     | ✅ (WS-08: 58 files, specifier-only)                                                                                       |
| No scope creep                                                                                       | ✅ (implementations `R2StorageProvider`/`LocalStorageProvider` stay in `document`; no `platform/index.ts`; apps untouched) |
| Matches patterns                                                                                     | ✅ (`.js` ESM specifiers, explicit named exports, no `export *` in module index)                                           |
| Spec-anchored outcome check                                                                          | ✅                                                                                                                         |
| Per-layer coverage expectation                                                                       | ✅ N/A for new logic (none); existing suite unchanged at 102/575                                                           |
| Every test maps to a spec requirement                                                                | ✅ no tests added or removed                                                                                               |
| Documented guidelines followed: `CLAUDE.md` (no barrel re-export-everything, explicit named exports) | ✅                                                                                                                         |

---

## Gate Check

- **Gate commands**: `pnpm --filter @repo/core exec vitest run`; `pnpm lint --force`; `pnpm typecheck --force`; `pnpm build --force`
- **Result**: 575 passed, 0 failed, 0 skipped (102 files); lint/typecheck/build exit 0 with 0 cached tasks
- **Test count before feature**: 102 files / 575 tests (`0d5f14bd`)
- **Test count after feature**: 102 files / 575 tests
- **Delta**: +0
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None required.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 11/11 ACs matched the spec outcome, 0 spec-precision gaps
**Sensor**: 7/7 mutations killed
**Gate**: 575 passed; lint, typecheck and build exit 0 (uncached)

**What works**: StorageProvider relocated byte-identically; workspace module exposes exactly the old 66 names; root barrel names unchanged; the diff is specifier-only with history preserved; apps untouched.

**Issues found**: none blocking. Informational: the gates alone would not catch export-set or import-edge regressions in this area (mutants 1-5), so the structural checks should be re-run on future workspace moves.

**Next steps**: none for this feature. Spec traceability statuses were intentionally left unchanged by the verifier.
