# MOD-1 Step 1.1 — Group organization, member and invitation into `modules/workspace` Specification

## Problem Statement

`packages/core/src/modules/{organization,member,invitation}` are three sibling modules for one concept (the broker's workspace). `invitation` imports `member` and `organization` internals, and `organization` imports `document/domain/storage-provider`, an accidental `workspace → documents` edge that the approved context map (`docs/architecture/context-map.md` §2) does not allow. Step 1.1 of `docs/architecture/2026-09-13-migration-plan.md` groups them into one module and moves the `StorageProvider` interface to `platform/storage` before later steps build on the workspace API.

## Goals

- [ ] One `modules/workspace` module whose `index.ts` exports exactly the names the three old `index.ts` files exported.
- [ ] Zero imports of `document/**` from workspace code.
- [ ] Zero behavior change: same test count (102 files / 575 tests baseline at `0d5f14bd`), same public names from `@repo/core`, apps unchanged.

## Out of Scope

| Feature                                                                             | Reason                                                                           |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Moving `R2StorageProvider` / `LocalStorageProvider` implementations                 | Plan moves only the interface; implementations stay in `document` until Step 6.3 |
| Replacing `MemberRepository` imports in `claim` / `commission` with a directory API | Step 2.1 / 2.2 (only their import paths change here)                             |
| Removing `Prisma*Repository` from the public index, subpath exports, DI tokens      | Steps 7.1 / 7.2                                                                  |
| Renaming any symbol, file basename, or DI string token                              | "Move, then change" rule (plan §0)                                               |
| Moving `shared/` to `shared-kernel/` or `cache` to `platform/cache`                 | Not part of Step 1.1                                                             |
| Any change in `apps/*`                                                              | Apps import through the root barrel, which keeps the same names                  |

---

## Assumptions & Open Questions

| Assumption / decision         | Chosen default                                                                                                                                                                           | Rationale                                                                                     | Confirmed? |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------- |
| Sub-folder names              | `modules/workspace/organization`, `modules/workspace/members`, `modules/workspace/invitations`, each keeping its `domain/`, `application/`, `infrastructure/` folders and file basenames | Exact names from plan Step 1.1 target state                                                   | n          |
| Sub-folder `index.ts` files   | Deleted; `workspace/index.ts` holds the union of their export statements with paths rewritten                                                                                            | One public surface per module; `export *` from sub-indexes would reintroduce barrel re-export | n          |
| `StorageProvider` public name | `document/index.ts` keeps exporting `StorageProvider` and `UploadResult` types, now re-exported from `platform/storage/storage-provider.ts`; `platform` gets no root-barrel line         | Keeps `@repo/core` names identical without a duplicate-export conflict                        | n          |
| `platform/storage` shape      | Single file `packages/core/src/platform/storage/storage-provider.ts`, content byte-identical to today's file; no `platform/index.ts` yet                                                 | Plan names only this file; adding an index would be speculative                               | n          |
| Delivery                      | One PR with two commits: (1) move `StorageProvider`, (2) move the three modules                                                                                                          | Each commit keeps every gate green and is revertable alone                                    | n          |
| History                       | Files moved with `git mv`; commit contains no content changes other than import specifiers                                                                                               | `git log --follow` keeps history (plan §0)                                                    | n          |

**Open questions:** none — all logged above.

---

## User Stories

### P1: StorageProvider lives in platform ⭐ MVP

**User Story**: As a module author, I want the storage port in `platform/storage` so that workspace and documents both depend on platform instead of on each other.

**Why P1**: Removes the `workspace → documents` edge forbidden by the context map.

**Acceptance Criteria**:

1. The file `packages/core/src/platform/storage/storage-provider.ts` SHALL exist with the same `UploadResult` and `StorageProvider` declarations as the former `modules/document/domain/storage-provider.ts`. <!-- WS-01 -->
2. The file `packages/core/src/modules/document/domain/storage-provider.ts` SHALL NOT exist. <!-- WS-02 -->
3. WHEN `@repo/core` is imported THEN the root barrel SHALL still export the type names `StorageProvider` and `UploadResult`. <!-- WS-03 -->
4. IF any file under `packages/core/src/modules/workspace/**` imports a path containing `/document/` THEN the gate SHALL fail (expected count: 0). <!-- WS-04 -->

**Independent Test**: `pnpm --filter @repo/core typecheck` passes; `grep -rn "/document/" packages/core/src/modules/workspace` returns nothing.

---

### P1: One workspace module with an unchanged public surface ⭐ MVP

**User Story**: As an app developer, I want `organization`, `member` and `invitation` grouped under `modules/workspace` so that later steps have a single workspace API, without changing anything I import.

**Why P1**: Plan Phase 1 depends on a stable `workspace` module.

**Acceptance Criteria**:

1. The directories `packages/core/src/modules/{organization,member,invitation}` SHALL NOT exist, and every non-index file from them SHALL exist under `modules/workspace/{organization,members,invitations}` with the same relative path inside the sub-folder and the same basename. <!-- WS-05 -->
2. The set of names exported by `modules/workspace/index.ts` SHALL equal the union of names exported by the three former `index.ts` files at `0d5f14bd` (value and type exports, no additions, no removals). <!-- WS-06 -->
3. The root barrel `packages/core/src/index.ts` SHALL export `./modules/workspace/index.js` and SHALL NOT reference `modules/organization`, `modules/member` or `modules/invitation`. <!-- WS-07 -->
4. The moved and importing files SHALL differ from their `0d5f14bd` versions only in import/export module specifiers. <!-- WS-08 -->
5. WHEN `pnpm --filter @repo/core test` runs THEN it SHALL report 102 test files and 575 tests passed, 0 failed, 0 skipped. <!-- WS-09 -->
6. WHEN `pnpm lint`, `pnpm typecheck` and `pnpm build` run from the root THEN each SHALL exit 0. <!-- WS-10 -->
7. The commits SHALL contain no changes under `apps/`. <!-- WS-11 -->

**Independent Test**: Compare `workspace/index.ts` export names with the old three indexes (script); run the 4 root gates; `git diff --stat 0d5f14bd -- apps` is empty.

---

## Edge Cases

- IF a consumer outside workspace imports a moved internal by relative path (`claim/application/create-claim.ts`, `create-claim.spec.ts`, `commission/application/{approve-commission-admin,reject-commission}.ts`, `approve-commission.spec.ts`, `reject-commission.spec.ts`, `policy/application/ensure-policy-pdf.ts`) THEN only that import specifier SHALL be updated to the new path.
- WHEN a moved file imports `shared/` THEN its relative specifier SHALL gain one `../` level and resolve to the same file.
- IF two old indexes exported the same name THEN the build SHALL fail at typecheck (expected: no collisions today; typecheck proves it).

---

## Requirement Traceability

| Requirement ID | Story                           | Phase   | Status       |
| -------------- | ------------------------------- | ------- | ------------ |
| WS-01          | P1: StorageProvider in platform | Execute | Implementing |
| WS-02          | P1: StorageProvider in platform | Execute | Implementing |
| WS-03          | P1: StorageProvider in platform | Execute | Implementing |
| WS-04          | P1: StorageProvider in platform | Execute | Implementing |
| WS-05          | P1: Workspace module            | Execute | Implementing |
| WS-06          | P1: Workspace module            | Execute | Implementing |
| WS-07          | P1: Workspace module            | Execute | Implementing |
| WS-08          | P1: Workspace module            | Execute | Implementing |
| WS-09          | P1: Workspace module            | Execute | Implementing |
| WS-10          | P1: Workspace module            | Execute | Implementing |
| WS-11          | P1: Workspace module            | Execute | Implementing |

**Coverage:** 11 total, 11 mapped to execution steps, 0 unmapped.

---

## Success Criteria

- [ ] 5 quality gates green (`lint`, `typecheck`, `build`, `test`, ACs above).
- [ ] `git log --follow` on a moved file shows its pre-move history.
