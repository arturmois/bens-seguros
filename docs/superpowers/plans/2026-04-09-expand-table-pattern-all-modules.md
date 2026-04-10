# Expand Zenith Table Pattern to All Modules — Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 11 remaining modules to the Clients pattern — TanStack Table + shared primitives (DataTable, CursorPagination, FilterTabs, TableToolbar, MobileCardList, useCursorPagination).

**Architecture:** Each module gets its own branch and PR. Modules are grouped by similarity and ordered by ascending complexity so early wins build confidence.

**Tech Stack:** React 19, TanStack Table, shadcn/ui (@coss/style), Tailwind CSS 4, Next.js 16

**Spec:** `docs/superpowers/specs/2026-04-09-shared-table-primitives-design.md`

**Reference implementation:** `apps/web/src/features/clients/` (post-refactoring)

---

## Module Grouping & Priority

### Group 1 — Simple Paginated Tables (smallest scope, validate pattern)

These modules already have cursor pagination, toolbar, and row components. Migration is mostly mechanical: replace manual `<Table>` with `DataTable<T>`, replace local pagination with `CursorPagination`, add `FilterTabs`, add `MobileCardList`, add `useCursorPagination`.

| #   | Module          | Lines | Has Toolbar | Has Pagination | Has Form | Has Detail | Estimated Effort |
| --- | --------------- | ----- | ----------- | -------------- | -------- | ---------- | ---------------- |
| 1   | **commissions** | 99    | Yes         | Yes            | No       | Yes        | Small            |
| 2   | **assistances** | 95    | Yes         | Yes            | Page     | Yes        | Small            |
| 3   | **claims**      | 123   | Yes         | Yes            | Page     | Yes        | Small-Medium     |
| 4   | **audit**       | 178   | No          | Yes            | No       | Modal      | Small            |

### Group 2 — Complex Paginated Tables

Larger modules with more components, special features (kanban, cancel flows, inline pagination).

| #   | Module        | Lines | Special Features                                            | Estimated Effort |
| --- | ------------- | ----- | ----------------------------------------------------------- | ---------------- |
| 5   | **policies**  | 195   | Cancel dialog, inline pagination, no form                   | Medium           |
| 6   | **proposals** | 180   | Kanban view, stage actions, LostReasonDialog, 31 components | Large            |

### Group 3 — Settings Tables (no pagination, sheet/dialog forms)

These modules live inside `/settings` and have no pagination. Migration adds TanStack (sorting + column visibility) but pagination changes are minimal.

| #   | Module        | Lines | Form Type                   | Estimated Effort |
| --- | ------------- | ----- | --------------------------- | ---------------- |
| 7   | **insurers**  | 143   | Sheet                       | Small            |
| 8   | **ai-agents** | 189   | Sheet                       | Small-Medium     |
| 9   | **channels**  | 191   | Sheet (complex, Meta OAuth) | Medium           |
| 10  | **members**   | 233   | Dialog (invite)             | Medium           |

### Group 4 — Special

| #   | Module           | Lines | Notes                                                                                                | Estimated Effort |
| --- | ---------------- | ----- | ---------------------------------------------------------------------------------------------------- | ---------------- |
| 11  | **endorsements** | 130   | Kanban-based, not table list. Shares ProposalKanban. Skip table migration — only needs shared utils. | Minimal          |

---

## Template: What Each Module Migration Looks Like

Every module migration follows the same recipe. Refer to `features/clients/` as the reference.

### Files to CREATE per module

```
features/<module>/
├── lib/
│   ├── types.ts              — FormValues type + Orval aliases (ClientData → ProposalData, etc.)
│   └── type-guards.ts        — isSortBy(), isStatusType(), etc.
├── components/
│   ├── <module>-columns.tsx   — ColumnDef<ModuleData>[] with sortable headers
│   ├── <module>-card.tsx      — Single mobile card for MobileCardList renderCard
│   └── <module>-table.tsx     — Orchestrator using shared primitives
```

### Files to DELETE per module (absorbed by shared)

```
- <module>-table-rows.tsx     → DataTable (headers + body)
- <module>-pagination.tsx     → CursorPagination
- <module>-toolbar.tsx        → TableToolbar + children  (if exists)
- delete-*-dialog.tsx         → ConfirmDeleteDialog      (if exists)
```

### Files to MODIFY per module

```
- hooks/use-<module>.ts       — import extractErrorMessage from @/lib
- lib/constants.ts            — add HIDEABLE_COLUMNS, move types to types.ts
- <module>-detail.tsx          — use DetailInfoItem, ConfirmDeleteDialog from shared (if exists)
```

### Files to KEEP as-is

```
- <module>-form.tsx            — domain-specific
- <module>-form-fields.tsx     — domain-specific
- <module>-detail.tsx           — domain-specific (with import updates)
- <module>-status-badge.tsx     — domain-specific
- <module>-*-button.tsx         — domain-specific (export, etc.)
```

---

## Per-Module Implementation Plans

Each module below is a self-contained task group that produces its own branch and PR.

---

### Module 1: Commissions

**Branch:** `refactor/commissions-table-pattern`

**Current state:** Manual table, cursor pagination, toolbar, table-rows component. No form. Detail page exists.

**Files:**

- Create: `features/commissions/lib/types.ts`
- Create: `features/commissions/lib/type-guards.ts`
- Create: `features/commissions/components/commissions-columns.tsx`
- Create: `features/commissions/components/commission-card.tsx`
- Modify: `features/commissions/components/commissions-table.tsx` — rewrite with shared primitives
- Modify: `features/commissions/lib/constants.ts` — move types to types.ts, add HIDEABLE_COLUMNS
- Modify: `features/commissions/hooks/use-commissions.ts` — use shared extractErrorMessage
- Modify: `features/commissions/components/commission-detail.tsx` — use shared DetailInfoItem
- Delete: `features/commissions/components/commissions-table-rows.tsx`
- Delete: `features/commissions/components/commissions-pagination.tsx`
- Delete: `features/commissions/components/commissions-toolbar.tsx`

**Steps:**

- [ ] **Step 1:** Read current `commissions-table.tsx`, `commissions-table-rows.tsx`, `commissions-toolbar.tsx`, `commissions-pagination.tsx`, `use-commissions.ts`, `lib/constants.ts` to understand current data shapes and filters
- [ ] **Step 2:** Create `lib/types.ts` with `CommissionData`, `CommissionStatus`, `CommissionFilters`, `CommissionFormValues` (if applicable) from Orval model types
- [ ] **Step 3:** Create `lib/type-guards.ts` with `isSortBy()` and `isCommissionStatus()` guards
- [ ] **Step 4:** Update `lib/constants.ts` — move type aliases to `types.ts`, add `HIDEABLE_COLUMNS`, `DEFAULT_COLUMN_VISIBILITY`, `DEFAULT_SORTING`, `STATUS_FILTER_OPTIONS`
- [ ] **Step 5:** Create `commissions-columns.tsx` with `ColumnDef<CommissionData>[]` — sortable headers for key columns, status badge cell, currency formatting, actions dropdown
- [ ] **Step 6:** Create `commission-card.tsx` — mobile card with status badge, amount, policy reference
- [ ] **Step 7:** Rewrite `commissions-table.tsx` as orchestrator using `DataTable`, `MobileCardList`, `CursorPagination`, `FilterTabs`, `TableToolbar`, `TableErrorState`, `useCursorPagination`. Pass export button as `TableToolbar` children
- [ ] **Step 8:** Update `use-commissions.ts` — import `extractErrorMessage` from `@/lib`, remove local error handling if duplicated
- [ ] **Step 9:** Update `commission-detail.tsx` — use `DetailInfoItem` from `@/components/shared` where applicable
- [ ] **Step 10:** Delete absorbed files: `commissions-table-rows.tsx`, `commissions-pagination.tsx`, `commissions-toolbar.tsx`
- [ ] **Step 11:** Update `app/(dashboard)/commissions/page.tsx` — use `flex h-full flex-col` layout for sticky header
- [ ] **Step 12:** Run `pnpm --filter @app/web exec tsc --noEmit` — must pass
- [ ] **Step 13:** Run `pnpm --filter @app/web lint` — must pass
- [ ] **Step 14:** Run `pnpm --filter @app/web build` — must pass
- [ ] **Step 15:** Commit and push: `refactor(web): migrate commissions table to shared primitives`

---

### Module 2: Assistances

**Branch:** `refactor/assistances-table-pattern`

**Current state:** Manual table, cursor pagination, toolbar, table-rows component. Page-based form at /assistances/new. Detail page.

**Files:**

- Create: `features/assistances/lib/types.ts`
- Create: `features/assistances/lib/type-guards.ts`
- Create: `features/assistances/components/assistances-columns.tsx`
- Create: `features/assistances/components/assistance-card.tsx`
- Modify: `features/assistances/components/assistances-table.tsx` — rewrite with shared primitives
- Modify: `features/assistances/lib/constants.ts` — move types, add HIDEABLE_COLUMNS
- Modify: `features/assistances/hooks/use-assistances.ts` — use shared extractErrorMessage
- Modify: `features/assistances/components/assistance-detail.tsx` — use shared DetailInfoItem
- Delete: `features/assistances/components/assistances-table-rows.tsx`
- Delete: `features/assistances/components/assistances-pagination.tsx`
- Delete: `features/assistances/components/assistances-toolbar.tsx`

**Steps:** Same pattern as Module 1. Key differences:

- [ ] **Step 1-4:** Read, create types/type-guards, update constants
- [ ] **Step 5:** Create `assistances-columns.tsx` — status badge, policy reference, type, dates
- [ ] **Step 6:** Create `assistance-card.tsx` — mobile card with status, type, policy info
- [ ] **Step 7:** Rewrite `assistances-table.tsx` orchestrator
- [ ] **Step 8:** Update `use-assistances.ts` — shared extractErrorMessage
- [ ] **Step 9:** Update `assistance-detail.tsx` — shared DetailInfoItem
- [ ] **Step 10:** Delete absorbed files
- [ ] **Step 11:** Update page layout for sticky header
- [ ] **Step 12-14:** typecheck, lint, build
- [ ] **Step 15:** Commit: `refactor(web): migrate assistances table to shared primitives`

---

### Module 3: Claims

**Branch:** `refactor/claims-table-pattern`

**Current state:** Manual table, cursor pagination, toolbar, table-rows. Page-based form. Detail page. Has delete dialog.

**Files:**

- Create: `features/claims/lib/types.ts`
- Create: `features/claims/lib/type-guards.ts`
- Create: `features/claims/components/claims-columns.tsx`
- Create: `features/claims/components/claim-card.tsx`
- Modify: `features/claims/components/claims-table.tsx` — rewrite
- Modify: `features/claims/lib/constants.ts`
- Modify: `features/claims/hooks/use-claims.ts`
- Modify: `features/claims/components/claim-detail.tsx` — use shared DetailInfoItem, ConfirmDeleteDialog
- Delete: `features/claims/components/claims-table-rows.tsx`
- Delete: `features/claims/components/claims-pagination.tsx`
- Delete: `features/claims/components/claims-toolbar.tsx`
- Delete: `features/claims/components/delete-claim-dialog.tsx` — replaced by shared ConfirmDeleteDialog

**Steps:** Same pattern. Key difference: delete dialog migration.

- [ ] **Step 1-4:** Read, types, type-guards, constants
- [ ] **Step 5:** Create `claims-columns.tsx` — priority badge, status badge, policy ref, amounts
- [ ] **Step 6:** Create `claim-card.tsx` — mobile card
- [ ] **Step 7:** Rewrite `claims-table.tsx` — use `ConfirmDeleteDialog` with `entityLabel="sinistro"`
- [ ] **Step 8:** Update hooks — shared extractErrorMessage
- [ ] **Step 9:** Update `claim-detail.tsx` — shared DetailInfoItem, ConfirmDeleteDialog
- [ ] **Step 10:** Delete absorbed files including `delete-claim-dialog.tsx`
- [ ] **Step 11:** Update page layout
- [ ] **Step 12-14:** Quality gates
- [ ] **Step 15:** Commit: `refactor(web): migrate claims table to shared primitives`

---

### Module 4: Audit

**Branch:** `refactor/audit-table-pattern`

**Current state:** Manual table with inline pagination and inline skeleton. No toolbar, no form. Detail via modal.

**Files:**

- Create: `features/audit/lib/types.ts`
- Create: `features/audit/lib/type-guards.ts`
- Create: `features/audit/components/audit-columns.tsx`
- Create: `features/audit/components/audit-card.tsx`
- Modify: `features/audit/components/audit-table.tsx` — rewrite (currently has inline pagination)
- Modify: `features/audit/hooks/use-audit-logs.ts`

**Steps:**

- [ ] **Step 1-4:** Read, types, type-guards, constants
- [ ] **Step 5:** Create `audit-columns.tsx` — action type badge, entity type, user, timestamp
- [ ] **Step 6:** Create `audit-card.tsx` — mobile card
- [ ] **Step 7:** Rewrite `audit-table.tsx` — extract inline pagination/skeleton to shared. Add `TableToolbar` with search. Add `FilterTabs` for action types if applicable
- [ ] **Step 8:** Update hooks
- [ ] **Step 9:** Update page layout
- [ ] **Step 10-12:** Quality gates
- [ ] **Step 13:** Commit: `refactor(web): migrate audit table to shared primitives`

---

### Module 5: Policies

**Branch:** `refactor/policies-table-pattern`

**Current state:** Manual table, inline cursor pagination (not separate component), toolbar. No form. Detail page. Cancel dialog (not delete).

**Files:**

- Create: `features/policies/lib/types.ts`
- Create: `features/policies/lib/type-guards.ts`
- Create: `features/policies/components/policies-columns.tsx`
- Create: `features/policies/components/policy-card.tsx`
- Modify: `features/policies/components/policies-table.tsx` — rewrite (195 lines, has inline pagination)
- Modify: `features/policies/lib/constants.ts`
- Modify: `features/policies/hooks/use-policies.ts`
- Modify: `features/policies/components/policy-detail.tsx` — use shared DetailInfoItem
- Delete: `features/policies/components/policies-table-toolbar.tsx`
- Keep: `features/policies/components/cancel-policy-dialog.tsx` — NOT a generic delete, has policy-specific logic

**Steps:**

- [ ] **Step 1-4:** Read, types, type-guards, constants
- [ ] **Step 5:** Create `policies-columns.tsx` — policy number, branch, status badge, premium, validity dates
- [ ] **Step 6:** Create `policy-card.tsx` — mobile card
- [ ] **Step 7:** Rewrite `policies-table.tsx` — extract inline pagination to `CursorPagination`, keep `CancelPolicyDialog` (domain-specific)
- [ ] **Step 8:** Update hooks
- [ ] **Step 9:** Update detail — shared DetailInfoItem
- [ ] **Step 10:** Delete `policies-table-toolbar.tsx`
- [ ] **Step 11:** Update page layout
- [ ] **Step 12-14:** Quality gates
- [ ] **Step 15:** Commit: `refactor(web): migrate policies table to shared primitives`

---

### Module 6: Proposals

**Branch:** `refactor/proposals-table-pattern`

**Current state:** The most complex module — 31 components, kanban view, stage actions, LostReasonDialog, toolbar with 3 filters. Table + kanban coexist.

**IMPORTANT:** Only migrate the TABLE view. The kanban view (`proposal-kanban.tsx`, 309 lines) stays as-is.

**Files:**

- Create: `features/proposals/lib/types.ts` (if not exists — may overlap with existing types)
- Create: `features/proposals/lib/type-guards.ts`
- Create: `features/proposals/components/proposals-columns.tsx`
- Create: `features/proposals/components/proposal-card.tsx` (mobile card for TABLE view)
- Modify: `features/proposals/components/proposals-table.tsx` — rewrite table orchestrator
- Modify: `features/proposals/lib/constants.ts`
- Modify: `features/proposals/hooks/use-proposals.ts`
- Delete: `features/proposals/components/proposals-table-toolbar.tsx`
- Delete: `features/proposals/components/proposals-pagination.tsx`
- Delete: `features/proposals/components/proposals-table-parts.tsx`
- Delete: `features/proposals/components/proposal-table-row.tsx`
- Keep: `features/proposals/components/proposal-kanban.tsx` — untouched
- Keep: `features/proposals/components/lost-reason-dialog.tsx` — domain-specific

**Steps:**

- [ ] **Step 1-4:** Read all 31 components to understand relationships, types, constants
- [ ] **Step 5:** Create `proposals-columns.tsx` — client name, branch, stage badge, board type, premium, created date, actions (advance, lost)
- [ ] **Step 6:** Create `proposal-card.tsx` — mobile card for table view
- [ ] **Step 7:** Rewrite `proposals-table.tsx` — use shared primitives, keep `LostReasonDialog`, `advanceMutation` domain logic
- [ ] **Step 8:** Update hooks
- [ ] **Step 9:** Delete absorbed files
- [ ] **Step 10:** Update page layout — note: page switches between table and kanban views
- [ ] **Step 11-13:** Quality gates
- [ ] **Step 14:** Commit: `refactor(web): migrate proposals table view to shared primitives`

---

### Module 7: Insurers

**Branch:** `refactor/insurers-table-pattern`

**Current state:** No pagination, sheet-based form, dropdown actions (edit, toggle active). Small dataset always loaded in memory.

**Migration adds:** TanStack Table with sorting + column visibility. No `CursorPagination` needed. Add `MobileCardList` for mobile.

**Files:**

- Create: `features/insurers/lib/types.ts`
- Create: `features/insurers/components/insurers-columns.tsx`
- Create: `features/insurers/components/insurer-card.tsx`
- Modify: `features/insurers/components/insurers-table.tsx` — add TanStack, sorting, column visibility
- Modify: `features/insurers/components/insurers-table-toolbar.tsx` → migrate to `TableToolbar`

**Steps:**

- [ ] **Step 1-3:** Read, types, constants
- [ ] **Step 4:** Create `insurers-columns.tsx` — name, code, active status badge, updated date, actions (edit, toggle)
- [ ] **Step 5:** Create `insurer-card.tsx`
- [ ] **Step 6:** Rewrite `insurers-table.tsx` — `useReactTable` with `getCoreRowModel`, no pagination, `DataTable` + `MobileCardList`
- [ ] **Step 7:** Delete old toolbar, use `TableToolbar`
- [ ] **Step 8-10:** Quality gates
- [ ] **Step 11:** Commit: `refactor(web): migrate insurers table to shared primitives`

---

### Module 8: AI Agents

**Branch:** `refactor/ai-agents-table-pattern`

**Current state:** No pagination, sheet-based form, delete dialog. Settings module.

**Files:**

- Create: `features/ai-agents/lib/types.ts`
- Create: `features/ai-agents/components/ai-agents-columns.tsx`
- Create: `features/ai-agents/components/ai-agent-card.tsx`
- Modify: `features/ai-agents/components/ai-agents-table.tsx`
- Modify: `features/ai-agents/components/ai-agents-page.tsx`
- Delete: `features/ai-agents/components/delete-agent-dialog.tsx` → shared ConfirmDeleteDialog

**Steps:**

- [ ] **Step 1-3:** Read, types, constants
- [ ] **Step 4:** Create `ai-agents-columns.tsx` — name, provider badge, model, channel count, status, actions
- [ ] **Step 5:** Create `ai-agent-card.tsx`
- [ ] **Step 6:** Rewrite `ai-agents-table.tsx` — TanStack, no pagination, shared primitives
- [ ] **Step 7:** Delete `delete-agent-dialog.tsx`, use `ConfirmDeleteDialog` with `entityLabel="agente"`
- [ ] **Step 8-10:** Quality gates
- [ ] **Step 11:** Commit: `refactor(web): migrate ai-agents table to shared primitives`

---

### Module 9: Channels

**Branch:** `refactor/channels-table-pattern`

**Current state:** No pagination, sheet-based form (complex with Meta OAuth), deactivate dialog. Settings module. 16 components.

**NOTE:** Only migrate the table rendering. Meta OAuth, QR code, embedded signup components are domain-specific and stay as-is.

**Files:**

- Create: `features/channels/lib/types.ts`
- Create: `features/channels/components/channels-columns.tsx`
- Create: `features/channels/components/channel-card.tsx`
- Modify: `features/channels/components/channels-table.tsx`
- Modify: `features/channels/components/channels-page.tsx`
- Keep: `deactivate-channel-dialog.tsx` — domain-specific (deactivate ≠ delete)

**Steps:**

- [ ] **Step 1-3:** Read, types, constants
- [ ] **Step 4:** Create `channels-columns.tsx` — channel icon, name, type badge, status badge, agent link, actions
- [ ] **Step 5:** Create `channel-card.tsx`
- [ ] **Step 6:** Rewrite `channels-table.tsx` — TanStack, no pagination, shared primitives
- [ ] **Step 7-9:** Quality gates
- [ ] **Step 10:** Commit: `refactor(web): migrate channels table to shared primitives`

---

### Module 10: Members

**Branch:** `refactor/members-table-pattern`

**Current state:** No pagination, 233 lines (over limit), inline role select, inline remove. Settings module. Most complex settings table.

**Files:**

- Create: `features/members/lib/types.ts`
- Create: `features/members/components/members-columns.tsx`
- Create: `features/members/components/member-card.tsx`
- Modify: `features/members/components/members-table.tsx` — rewrite from 233 to ~120 lines
- Modify: `features/members/components/members-page.tsx`

**Steps:**

- [ ] **Step 1-3:** Read, types, constants
- [ ] **Step 4:** Create `members-columns.tsx` — avatar, name, email, role select (inline), joined date, actions (remove)
- [ ] **Step 5:** Create `member-card.tsx`
- [ ] **Step 6:** Rewrite `members-table.tsx` — TanStack, no pagination, shared primitives, `ConfirmDeleteDialog` for member removal
- [ ] **Step 7-9:** Quality gates
- [ ] **Step 10:** Commit: `refactor(web): migrate members table to shared primitives`

---

### Module 11: Endorsements (Minimal)

**Branch:** `refactor/endorsements-shared-utils`

**Current state:** Kanban-based (uses ProposalKanban), NOT a table view. Only needs shared utils wiring.

**Files:**

- Modify: `features/endorsements/hooks/use-endorsements.ts` — use shared extractErrorMessage (if applicable)

**Steps:**

- [ ] **Step 1:** Read `use-endorsements.ts`, check if it has local error handling
- [ ] **Step 2:** Wire to shared `extractErrorMessage` if applicable
- [ ] **Step 3:** Quality gates
- [ ] **Step 4:** Commit: `refactor(web): wire endorsements to shared utils`

---

## Execution Order

```
Phase 1 (validate pattern, low risk):
  Module 1: Commissions    → PR
  Module 2: Assistances    → PR
  Module 11: Endorsements  → PR (minimal, quick win)

Phase 2 (medium complexity):
  Module 3: Claims         → PR
  Module 4: Audit          → PR
  Module 5: Policies       → PR

Phase 3 (complex + settings):
  Module 7: Insurers       → PR
  Module 8: AI Agents      → PR
  Module 9: Channels       → PR
  Module 10: Members       → PR

Phase 4 (most complex, last):
  Module 6: Proposals      → PR
```

## Quality Gates (every module)

Before creating PR:

1. `pnpm --filter @app/web exec tsc --noEmit` — zero errors
2. `pnpm --filter @app/web lint` — zero errors
3. `pnpm --filter @app/web build` — successful
4. Manual verification: table renders, sort works, filters work, mobile cards render, pagination works (if applicable)

## Checklist per Module

- [ ] `lib/types.ts` created with all type aliases
- [ ] `lib/type-guards.ts` created
- [ ] `lib/constants.ts` updated (types removed, HIDEABLE_COLUMNS added)
- [ ] `*-columns.tsx` created with ColumnDef
- [ ] `*-card.tsx` created for mobile
- [ ] `*-table.tsx` rewritten as orchestrator with shared primitives
- [ ] `hooks/use-*.ts` uses shared `extractErrorMessage`
- [ ] `*-detail.tsx` uses shared `DetailInfoItem` (if applicable)
- [ ] Delete dialog uses shared `ConfirmDeleteDialog` (if applicable)
- [ ] Absorbed files deleted (table-rows, pagination, toolbar)
- [ ] Page layout uses `flex h-full flex-col` for sticky header
- [ ] All 3 quality gates pass
- [ ] Components under 200 lines
- [ ] Zero `any`, `console.log`, `eslint-disable`
