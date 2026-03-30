# Backlog Fixes Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 bugs (CPF/CNPJ mask, DatePicker year, Kanban) + 3 features (vehicle usage, dashboard renewal card, renewal link, auto-PDF) from Jira backlog.

**Architecture:** 6 independent changes across frontend and backend. Quick fixes first (masks, date picker, dropdown option), then dashboard stats extension, then renewal link UI, then auto-PDF trigger. All changes are additive — no migrations needed.

**Tech Stack:** Next.js 16, React 19, Fastify 5, Prisma, Zod, Orval (code gen), @react-pdf/renderer, BullMQ

**Branch:** `feat/backlog-fixes-sprint-2026-03-30`

**Jira Tickets:** SCRUM-38, SCRUM-44, SCRUM-39, SCRUM-43, SCRUM-41, SCRUM-42

---

## File Map

| Task | Action | File                                                                 |
| ---- | ------ | -------------------------------------------------------------------- |
| 1    | Modify | `apps/web/src/lib/masks.ts`                                          |
| 1    | Modify | `apps/web/src/features/clients/components/client-form-fields.tsx`    |
| 2    | Modify | `apps/web/src/components/ui/date-picker.tsx`                         |
| 3    | Modify | `apps/web/src/features/proposals/lib/branch-options.ts`              |
| 4    | Modify | `apps/server/src/routes/v1/stats/_schemas.ts`                        |
| 4    | Modify | `apps/server/src/routes/v1/stats/stats-helpers.ts`                   |
| 4    | Modify | `apps/web/src/features/dashboard/components/stats-cards.tsx`         |
| 5    | Modify | `apps/web/src/features/proposals/components/proposal-form.tsx`       |
| 5    | Create | `apps/web/src/features/proposals/components/policy-search.tsx`       |
| 5    | Modify | `apps/web/src/features/proposals/components/proposal-detail.tsx`     |
| 5    | Create | `apps/web/src/features/proposals/components/renewal-policy-card.tsx` |
| 6    | Modify | `apps/server/src/routes/v1/policies/issue-policy.ts`                 |

---

### Task 1: Fix CPF/CNPJ mask (SCRUM-38)

**Files:**

- Modify: `apps/web/src/lib/masks.ts`
- Modify: `apps/web/src/features/clients/components/client-form-fields.tsx`

**Problem:** `@react-input/mask` enforces the CPF mask length (11 digit placeholders), so you can never type 12+ digits to trigger the CNPJ mask switch. Deadlock.

**Solution:** Replace `InputMask` with a controlled `<Input>` that formats the value on change. Keep `documentMask()` as a pure formatter function.

- [ ] **Step 1: Update masks.ts — add format function, keep existing masks for other consumers**

Replace the `documentMask` function in `apps/web/src/lib/masks.ts` with a pure formatting function:

```typescript
export function formatDocument(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function stripDocument(formatted: string): string {
  return formatted.replace(/\D/g, '').slice(0, 14)
}
```

Keep the existing `CPF_MASK`, `CNPJ_MASK`, `documentMask` exports so nothing else breaks.

- [ ] **Step 2: Update client-form-fields.tsx — replace InputMask with controlled Input**

In `apps/web/src/features/clients/components/client-form-fields.tsx`, replace the document field's `InputMask` with a controlled `Input`:

```tsx
// Replace import
// REMOVE: import { documentMask, PHONE_MASK } from '@/lib/masks'
// ADD:
import { formatDocument, stripDocument, PHONE_MASK } from '@/lib/masks'

// Replace the document field Controller render:
;<Controller
  name="document"
  control={form.control}
  render={({ field }) => (
    <Input
      placeholder="000.000.000-00"
      disabled={isReadOnly}
      value={formatDocument(field.value ?? '')}
      onChange={(e) => {
        const raw = stripDocument(e.target.value)
        field.onChange(raw)
      }}
      onBlur={field.onBlur}
      name={field.name}
      ref={field.ref}
    />
  )}
/>
```

This stores raw digits in form state (e.g., `"12345678000190"`) and displays formatted (e.g., `"12.345.678/0001-90"`). The Zod schema `z.string().min(11).max(14)` validates the raw digit count.

- [ ] **Step 3: Verify in browser**

1. Navigate to http://localhost:3000/clients
2. Click "Novo Cliente"
3. Type a CPF (11 digits): should format as `123.456.789-01`
4. Clear and type a CNPJ (14 digits): should format as `12.345.678/0001-90`
5. Verify the mask transitions smoothly at 12 digits

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/masks.ts apps/web/src/features/clients/components/client-form-fields.tsx
git commit -m "fix(SCRUM-38): replace InputMask with controlled input for CPF/CNPJ

The @react-input/mask library enforced CPF mask length (11 placeholders),
creating a deadlock where CNPJ (14 digits) could never be typed.
Replaced with a controlled Input that formats on-the-fly."
```

---

### Task 2: Fix DatePicker year range (SCRUM-44)

**Files:**

- Modify: `apps/web/src/components/ui/date-picker.tsx`

**Problem:** `endMonth={new Date(new Date().getFullYear(), 11)}` limits the year dropdown to the current year. Can't select 2027+ for policy vigência.

- [ ] **Step 1: Update endMonth to allow future years**

In `apps/web/src/components/ui/date-picker.tsx`, line 66, change:

```typescript
// OLD:
endMonth={new Date(new Date().getFullYear(), 11)}
// NEW:
endMonth={new Date(new Date().getFullYear() + 10, 11)}
```

- [ ] **Step 2: Verify in browser**

1. Navigate to http://localhost:3000/clients → "Novo Cliente"
2. Click "Data de Nascimento" date picker
3. Open the year dropdown — should now show up to 2036
4. Verify scrolling and selection works for future years

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/date-picker.tsx
git commit -m "fix(SCRUM-44): extend DatePicker year range to +10 years

The year dropdown was limited to the current year, preventing selection
of future dates needed for policy vigência (e.g. 2026→2027)."
```

---

### Task 3: Add vehicle usage "App Driver" option (SCRUM-39)

**Files:**

- Modify: `apps/web/src/features/proposals/lib/branch-options.ts`

**Problem:** Missing "Motorista de Aplicativo (99, Uber)" option in vehicle usage dropdown.

- [ ] **Step 1: Add the option**

In `apps/web/src/features/proposals/lib/branch-options.ts`, add the new option to `VEHICLE_USAGE_OPTIONS`:

```typescript
export const VEHICLE_USAGE_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'Particular', label: 'Particular' },
  { value: 'Comercial', label: 'Comercial' },
  { value: 'Taxi', label: 'Táxi' },
  {
    value: 'Motorista de Aplicativo',
    label: 'Motorista de Aplicativo (99, Uber)',
  },
] as const
```

Note: Also fix `Taxi` → `Táxi` (proper Portuguese diacritics per CLAUDE.md rules).

Backend already accepts any string for `vehicleUsage` (`z.string().optional()`), so no backend changes needed.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/proposals/lib/branch-options.ts
git commit -m "feat(SCRUM-39): add 'Motorista de Aplicativo' vehicle usage option

Adds app driver (99, Uber) option to the vehicle usage dropdown.
Also fixes Taxi→Táxi diacritics."
```

---

### Task 4: Dashboard renewal 7 days card (SCRUM-43)

**Files:**

- Modify: `apps/server/src/routes/v1/stats/_schemas.ts`
- Modify: `apps/server/src/routes/v1/stats/stats-helpers.ts`
- Modify: `apps/web/src/features/dashboard/components/stats-cards.tsx`

#### Backend

- [ ] **Step 1: Add `renewalsNext7Days` to dashboard response schema**

In `apps/server/src/routes/v1/stats/_schemas.ts`, add the field to `dashboardDataSchema`:

```typescript
const dashboardDataSchema = z.object({
  proposalsByStage: z.array(proposalByStageSchema).readonly(),
  activePolicies: z.number(),
  expiringPolicies: z.number(),
  renewalsNext7Days: z.number(), // <-- ADD THIS
  // ... rest unchanged
})
```

- [ ] **Step 2: Add `renewalsNext7Days` to DashboardData interface and DateRange**

In `apps/server/src/routes/v1/stats/stats-helpers.ts`:

1. Add to `DateRange` interface:

```typescript
interface DateRange {
  readonly currentFrom: Date
  readonly previousFrom: Date
  readonly previousTo: Date
  readonly now: Date
  readonly thirtyDaysFromNow: Date
  readonly sevenDaysFromNow: Date // <-- ADD
}
```

2. Add to `buildDateRanges`:

```typescript
function buildDateRanges(preset: DashboardPreset): DateRange {
  const now = new Date()
  const days = presetToDays(preset)
  const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const previousFrom = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000)
  const previousTo = currentFrom
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // <-- ADD
  return {
    currentFrom,
    previousFrom,
    previousTo,
    now,
    thirtyDaysFromNow,
    sevenDaysFromNow,
  }
}
```

3. Add to `DashboardData` interface:

```typescript
export interface DashboardData {
  readonly proposalsByStage: readonly ProposalByStage[]
  readonly activePolicies: number
  readonly expiringPolicies: number
  readonly renewalsNext7Days: number // <-- ADD
  // ... rest unchanged
}
```

- [ ] **Step 3: Add the query to fetchChartData**

In `fetchChartData`, add a new query at the end of the `Promise.all` array (index 7):

```typescript
async function fetchChartData(orgId: string, ranges: DateRange, db: DbClient) {
  const { currentFrom, thirtyDaysFromNow, sevenDaysFromNow, now } = ranges
  return Promise.all([
    // ... existing 7 queries (indices 0-6) unchanged ...

    // Index 7: Renewals in next 7 days
    db.policy.count({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
        endDate: { lte: sevenDaysFromNow, gte: now },
        deletedAt: null,
      },
    }),
  ])
}
```

- [ ] **Step 4: Wire the new field in buildDashboardData**

Update the destructuring in `buildDashboardData`:

```typescript
const [
  proposalsByStage,
  activePolicies,
  expiringPolicies,
  claimsByPriority,
  commissionsThisMonth,
  conversionRate,
  monthlyTrends,
  renewalsNext7Days, // <-- ADD
] = chartResults

return {
  proposalsByStage,
  activePolicies,
  expiringPolicies,
  renewalsNext7Days, // <-- ADD
  claimsByPriority,
  // ... rest unchanged
}
```

- [ ] **Step 5: Regenerate Orval types**

```bash
pnpm --filter @app/web generate:api
```

This updates the frontend types to include `renewalsNext7Days`.

#### Frontend

- [ ] **Step 6: Add the renewal card to StatsCards**

In `apps/web/src/features/dashboard/components/stats-cards.tsx`:

1. Add `RefreshCw` icon import:

```typescript
import {
  FileText,
  Shield,
  AlertTriangle,
  DollarSign,
  RefreshCw,
} from 'lucide-react'
```

2. Add 5th card and change grid from `lg:grid-cols-4` to `lg:grid-cols-5`:

```tsx
export function StatsCards({ data, isLoading }: StatsCardsProps) {
  // ... existing derived values unchanged ...

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* ... existing 4 cards unchanged ... */}
      <ComparisonStatCard
        title="Renovações em 7 dias"
        value={data?.renewalsNext7Days ?? 0}
        icon={<RefreshCw className="size-5" />}
        isLoading={isLoading}
      />
    </div>
  )
}
```

Note: No `comparison` prop — this is a simple count, not a period comparison.

- [ ] **Step 7: Verify in browser**

1. Navigate to http://localhost:3000/dashboard
2. Verify the 5th card "Renovações em 7 dias" appears
3. Should show "0" (no policies in test data)

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/routes/v1/stats/_schemas.ts apps/server/src/routes/v1/stats/stats-helpers.ts apps/web/src/features/dashboard/components/stats-cards.tsx apps/web/src/api/
git commit -m "feat(SCRUM-43): add renewals-in-7-days dashboard card

Adds a count of ACTIVE policies expiring within 7 days to the dashboard
stats API response and displays it as a 5th card in the stats row."
```

---

### Task 5: Renewal policy link in proposal form (SCRUM-41)

**Files:**

- Create: `apps/web/src/features/proposals/components/policy-search.tsx`
- Modify: `apps/web/src/features/proposals/components/proposal-form.tsx`
- Create: `apps/web/src/features/proposals/components/renewal-policy-card.tsx`
- Modify: `apps/web/src/features/proposals/components/proposal-detail.tsx`

#### Part A: PolicySearch component

- [ ] **Step 1: Create PolicySearch combobox**

Create `apps/web/src/features/proposals/components/policy-search.tsx` following the existing `ClientSearch` pattern:

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

import { useDebounce } from '@/hooks/use-debounce'
import { useListPolicies } from '@/api/endpoints/policies/policies'

interface PolicySearchProps {
  readonly value: string
  readonly onChange: (id: string) => void
}

export function PolicySearch({ value, onChange }: PolicySearchProps) {
  const [search, setSearch] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const debouncedSearch = useDebounce(search, 300)
  const enabled = debouncedSearch.length >= 2

  const { data: response, isLoading } = useListPolicies(
    { search: debouncedSearch, limit: 10, status: 'ACTIVE' },
    { query: { enabled, select: (r) => r.data.data } }
  )
  const results = response ?? []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectPolicy = useCallback(
    (policy: (typeof results)[number]) => {
      const label = `${policy.policyNumber} — ${policy.clientName ?? 'Sem cliente'}`
      onChange(policy.id)
      setSelectedLabel(label)
      setSearch(label)
      setShowResults(false)
    },
    [onChange]
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showResults || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      const item = results[highlightedIndex]
      if (item) selectPolicy(item)
    } else if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  const hasResults = showResults && results.length > 0
  const hasNoResults =
    showResults && enabled && !isLoading && results.length === 0
  const listId = 'policy-search-results'

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={hasResults || undefined}
          aria-controls={hasResults ? listId : undefined}
          className="pl-9"
          placeholder="Buscar apólice por número ou cliente..."
          value={value ? selectedLabel || search : search}
          onChange={(e) => {
            const val = e.target.value
            setSearch(val)
            setShowResults(true)
            setHighlightedIndex(-1)
            if (!val) {
              onChange('')
              setSelectedLabel('')
            }
          }}
          onFocus={() => {
            if (enabled) setShowResults(true)
          }}
          onKeyDown={handleKeyDown}
        />
        {isLoading && enabled && (
          <Loader2 className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {hasResults && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="bg-popover absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border p-1 shadow-lg"
        >
          {results.map((policy, idx) => (
            <li
              key={policy.id}
              id={`policy-option-${idx}`}
              role="option"
              aria-selected={idx === highlightedIndex}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm ${
                idx === highlightedIndex ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              onMouseDown={() => selectPolicy(policy)}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{policy.policyNumber}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {policy.clientName ?? 'Sem cliente'}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {policy.branch}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {hasNoResults && (
        <div
          role="status"
          className="bg-popover absolute z-50 mt-1 w-full rounded-lg border px-3 py-4 text-center shadow-lg"
        >
          <p className="text-muted-foreground text-sm">
            Nenhuma apólice encontrada
          </p>
        </div>
      )}
    </div>
  )
}
```

#### Part B: Add PolicySearch to proposal form

- [ ] **Step 2: Add renewal policy field to proposal-form.tsx**

In `apps/web/src/features/proposals/components/proposal-form.tsx`:

1. Add import:

```typescript
import { PolicySearch } from './policy-search'
```

2. Watch the `boardType` field value:

```typescript
const boardType = form.watch('boardType')
```

3. Add the PolicySearch field after the `boardType` Controller, conditionally rendered when `boardType === 'RENEWAL'`:

```tsx
{
  boardType === 'RENEWAL' && (
    <Controller
      control={form.control}
      name="renewalPolicyId"
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label>Apólice sendo renovada</Label>
          <PolicySearch value={field.value ?? ''} onChange={field.onChange} />
          {fieldState.error?.message ? (
            <p className="text-destructive text-sm">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  )
}
```

The `renewalPolicyId` field already exists in the `CreateProposalBody` Zod schema from Orval (optional string).

#### Part C: Show renewal policy data in proposal detail

- [ ] **Step 3: Create RenewalPolicyCard component**

Create `apps/web/src/features/proposals/components/renewal-policy-card.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { ExternalLink, RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { usePolicy } from '@/features/policies/hooks/use-policies'

interface RenewalPolicyCardProps {
  readonly policyId: string
}

export function RenewalPolicyCard({ policyId }: RenewalPolicyCardProps) {
  const { data: policy, isLoading, isError } = usePolicy(policyId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw className="size-4" />
            Apólice em Renovação
          </CardTitle>
        </CardHeader>
        <CardPanel className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </CardPanel>
      </Card>
    )
  }

  if (isError || !policy) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw className="size-4" />
            Apólice em Renovação
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/policies/${policyId}`}>
              <ExternalLink className="mr-1 size-3" />
              Ver apólice
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardPanel>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Nº Apólice</p>
            <p className="font-medium">{policy.policyNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Segurado</p>
            <p className="font-medium">{policy.clientName ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Vigência</p>
            <p className="font-medium">
              {formatDate(policy.startDate)} — {formatDate(policy.endDate)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Prêmio</p>
            <p className="font-medium">
              {formatCurrency(policy.premiumValueInCents)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <Badge variant="outline">{policy.status}</Badge>
          </div>
        </div>
      </CardPanel>
    </Card>
  )
}
```

- [ ] **Step 4: Add RenewalPolicyCard to proposal-detail.tsx**

In `apps/web/src/features/proposals/components/proposal-detail.tsx`:

1. Add import:

```typescript
import { RenewalPolicyCard } from './renewal-policy-card'
```

2. Add the card in the detail view, after the proposal info section and before the tabs. Conditionally render when `proposal.renewalPolicyId` exists:

```tsx
{
  proposal.renewalPolicyId && (
    <RenewalPolicyCard policyId={proposal.renewalPolicyId} />
  )
}
```

Check the exact location by reading the file — insert it between the proposal info section and the `<Tabs>` component.

- [ ] **Step 5: Verify in browser**

1. Navigate to http://localhost:3000/proposals
2. Click "Nova Proposta"
3. Select "Renovação" as board type
4. Verify the "Apólice sendo renovada" search field appears
5. Verify searching shows policy results (if any exist)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/proposals/components/policy-search.tsx apps/web/src/features/proposals/components/proposal-form.tsx apps/web/src/features/proposals/components/renewal-policy-card.tsx apps/web/src/features/proposals/components/proposal-detail.tsx
git commit -m "feat(SCRUM-41): add renewal policy link with data display

When creating a renewal proposal, shows a policy search field to link
the original policy. In the proposal detail, displays a card with the
linked policy data (insured, policy number, vigência, premium)."
```

---

### Task 6: Auto-generate PDF on policy issuance (SCRUM-42)

**Files:**

- Modify: `apps/server/src/routes/v1/policies/issue-policy.ts`

**Context:** The PDF generation route (`POST /api/v1/policies/:id/pdf`) and template (`PolicySummaryPdf`) already exist. We just need to trigger PDF generation automatically after issuing a policy.

- [ ] **Step 1: Add fire-and-forget PDF generation to issue-policy route**

In `apps/server/src/routes/v1/policies/issue-policy.ts`, after the `auditCreate` call, add a fire-and-forget call to the PDF generation logic:

```typescript
import {
  container,
  IssuePolicy,
  GetPolicy,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import { renderToBuffer } from '@react-pdf/renderer'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { PolicySummaryPdf } from '../../../pdf-templates/policy-summary-pdf.js'
import { issuePolicyBody, policyDetailResponse } from './_schemas.js'

export function issuePolicyRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/policies',
    schema: {
      tags: ['Policies'],
      summary: 'Issue a new policy from a proposal',
      operationId: 'issuePolicy',
      body: issuePolicyBody,
      response: { 201: policyDetailResponse },
    },
    preHandler: [requireAbility('create', 'Policy')],
    handler: async (request, reply) => {
      const useCase = container.resolve(IssuePolicy)
      try {
        const { coverageDetails, ...rest } = request.body
        const policy = await useCase.execute({
          organizationId: request.organizationId!,
          ...rest,
          coverageDetails: coverageDetails
            ? JSON.parse(JSON.stringify(coverageDetails))
            : undefined,
        })
        auditCreate({
          request,
          entityType: 'Policy',
          entityId: policy.id,
          after: policy,
        })

        // Fire-and-forget PDF generation
        const orgId = request.organizationId!
        const userId = request.user!.id
        void generatePolicySummaryPdf(policy.id, orgId, userId).catch(
          (err: unknown) => {
            request.log.error(
              { err, policyId: policy.id },
              'Failed to auto-generate policy PDF'
            )
          }
        )

        return reply.status(201).send({ success: true, data: policy })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}

async function generatePolicySummaryPdf(
  policyId: string,
  organizationId: string,
  userId: string
): Promise<void> {
  const documentRepo =
    container.resolve<DocumentRepository>('DocumentRepository')
  const storage = container.resolve<StorageProvider>('StorageProvider')
  const getPolicyUseCase = container.resolve(GetPolicy)

  const policy = await getPolicyUseCase.execute(policyId, organizationId)
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, logo: true },
  })
  if (!org) return

  let logoUrl: string | null = null
  if (org.logo) {
    logoUrl = await storage.getSignedUrl(org.logo)
  }

  const buffer = Buffer.from(
    await renderToBuffer(
      PolicySummaryPdf({
        policy,
        organization: { id: org.id, name: org.name, logo: logoUrl },
      })
    )
  )

  const storageKey = `organizations/${organizationId}/policies/${policyId}/apolice.pdf`
  await storage.upload(storageKey, buffer, 'application/pdf')

  await documentRepo.upsertByStorageKey({
    organizationId,
    entityType: 'POLICY',
    entityId: policyId,
    type: 'POLICY_PDF',
    fileName: `apolice-${policy.policyNumber}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: buffer.length,
    storageKey,
    createdBy: userId,
  })
}
```

The `void` prefix + `.catch()` ensures the PDF generation runs in the background without blocking the response or crashing on error.

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/routes/v1/policies/issue-policy.ts
git commit -m "feat(SCRUM-42): auto-generate policy PDF on issuance

After issuing a policy, the server fire-and-forgets PDF generation
using the existing PolicySummaryPdf template. The PDF is stored as
a POLICY_PDF document and visible in the policy documents tab."
```

---

### Task 7: Quality Gates

- [ ] **Step 1: Run all quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

All must pass with zero errors.

- [ ] **Step 2: Fix any issues found and commit fixes**

---

### Task 8: Final verification with Playwright

- [ ] **Step 1: Test SCRUM-38 — CPF/CNPJ**
      Navigate to Clients → "Novo Cliente" → type CNPJ (14 digits) → verify formatted as `XX.XXX.XXX/XXXX-XX`

- [ ] **Step 2: Test SCRUM-44 — DatePicker**
      Open any date picker → year dropdown should go to 2036

- [ ] **Step 3: Test SCRUM-39 — Vehicle Usage**
      Navigate to Proposals → create AUTO proposal → edit details → "Uso do Veículo" dropdown should include "Motorista de Aplicativo (99, Uber)"

- [ ] **Step 4: Test SCRUM-43 — Dashboard**
      Navigate to Dashboard → verify "Renovações em 7 dias" card appears

- [ ] **Step 5: Test SCRUM-41 — Renewal Link**
      Navigate to Proposals → "Nova Proposta" → select "Renovação" → verify policy search appears

- [ ] **Step 6: Test SCRUM-42 — Auto PDF**
      Issue a policy from a proposal at POLICY_ISSUED stage → navigate to policy → Documents tab → verify PDF was auto-generated
