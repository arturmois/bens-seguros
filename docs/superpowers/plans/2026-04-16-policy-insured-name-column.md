# SCRUM-54: Policy Insured Name Column — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Segurado" (insured/client name) column to the policy listing table and mobile card so users can identify policy ownership at a glance.

**Architecture:** Frontend-only change. The backend already returns `clientName` in the list-policies response. We add a column definition to the desktop DataTable and a subtitle line to the mobile PolicyCard.

**Tech Stack:** React 19, TanStack Table, shadcn/ui Tooltip (@base-ui), Next.js 16

---

## File Map

| File                                                             | Action | Responsibility                                                     |
| ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `apps/web/src/features/policies/components/policies-columns.tsx` | Modify | Add "Segurado" column after policyNumber with truncation + tooltip |
| `apps/web/src/features/policies/components/policy-card.tsx`      | Modify | Add client name subtitle below policy number                       |

No new files. No backend changes. No test files (pure UI rendering, verified via QA Playwright).

---

### Task 1: Add "Segurado" column to desktop table

**Files:**

- Modify: `apps/web/src/features/policies/components/policies-columns.tsx`

- [ ] **Step 1: Add Tooltip imports**

At the top of `policies-columns.tsx`, add the Tooltip imports alongside the existing ones:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
```

- [ ] **Step 2: Add "Segurado" column definition after policyNumber**

In the `createPolicyColumns` function, insert a new column object immediately after the `policyNumber` column (after line 43, before the `branch` column):

```tsx
    {
      accessorKey: 'clientName',
      header: 'Segurado',
      cell: ({ row }) => {
        const name = row.original.clientName
        if (!name) return <span className="text-muted-foreground">—</span>
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="block max-w-[200px] truncate">{name}</span>
                }
              />
              <TooltipContent side="top">{name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
```

Key details:

- `enableHiding: false` — column is always visible per spec
- `max-w-[200px] truncate` — truncates long names with ellipsis
- Tooltip shows full name on hover
- Fallback `"—"` for missing client name
- Uses same Tooltip pattern as `proposal-stage-actions.tsx`

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run lint**

Run: `pnpm --filter @app/web exec eslint src/features/policies/components/policies-columns.tsx`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/policies/components/policies-columns.tsx
git commit -m "feat(web): add Segurado column to policy listing table (SCRUM-54)"
```

---

### Task 2: Add client name to mobile PolicyCard

**Files:**

- Modify: `apps/web/src/features/policies/components/policy-card.tsx`

- [ ] **Step 1: Add client name subtitle below the policy number row**

In `policy-card.tsx`, insert a new line between the header `<div>` (line 35-40) and the grid `<div>` (line 42). Add immediately after the closing `</div>` of the flex row (after line 40):

```tsx
<p className="text-muted-foreground text-sm">{policy.clientName || '—'}</p>
```

The full component structure becomes:

```tsx
    <div className="...">
      {/* Header: policy number + status badge */}
      <div className="flex items-center justify-between">
        <span className="font-medium">{policy.policyNumber}</span>
        <Badge variant={...}>{...}</Badge>
      </div>

      {/* NEW: Client name subtitle */}
      <p className="text-muted-foreground text-sm">
        {policy.clientName || '—'}
      </p>

      {/* Grid: branch, value, validity, created */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        ...
      </div>
    </div>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run lint**

Run: `pnpm --filter @app/web exec eslint src/features/policies/components/policy-card.tsx`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/policies/components/policy-card.tsx
git commit -m "feat(web): add client name to mobile policy card (SCRUM-54)"
```

---

### Task 3: Visual QA verification

- [ ] **Step 1: Start dev server**

Run: `pnpm dev` (if not already running)

- [ ] **Step 2: Desktop verification**

Navigate to `/policies` logged in as `test@user.com` / `Senha@123`. Verify:

- "Segurado" column appears after "Nº Apólice"
- Column order: Nº Apólice → Segurado → Ramo → Status → Valor → Vigência → Criado em → Ações
- Client names display correctly
- Long names are truncated with "..." and show full name on hover tooltip
- Column visibility toggle does NOT include "Segurado" (it's not hideable)

- [ ] **Step 3: Mobile verification**

Resize browser to 375px width (or use DevTools mobile view). Verify:

- Policy cards show client name as subtitle below policy number
- Name appears in muted gray text, smaller than the policy number
- Cards with no client name show "—"

- [ ] **Step 4: Screenshot evidence**

Take screenshots of desktop table and mobile card for audit evidence. Save to `audit/` directory.
