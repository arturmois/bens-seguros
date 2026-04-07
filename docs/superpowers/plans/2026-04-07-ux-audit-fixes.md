# UX Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 23 UI/UX issues identified in the Playwright audit (6 critical, 9 medium, 8 low)

**Architecture:** Pure frontend fixes in `apps/web/src/`. No backend changes needed (D-1 is a known auth timing issue). Changes are grouped by feature area to minimize context-switching. Each task is self-contained and independently deployable.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui (@coss/style), Zod, React Hook Form, @dnd-kit

**Audit Report:** `audit/RELATORIO-AUDITORIA-UX.md`

---

### Task 1: Fix landing page text issues (L-1, L-2, L-3, L-5)

**Files:**

- Modify: `apps/web/src/features/marketing/components/pricing-card.tsx:107`
- Modify: `apps/web/src/features/marketing/components/marketing-footer.tsx:35`
- Modify: `apps/web/src/features/marketing/components/marketing-nav.tsx:19`
- Modify: `apps/web/src/features/marketing/components/pricing-section.tsx` (Enterprise ctaHref)
- Modify: `apps/web/src/app/layout.tsx` (root metadata template)
- Modify: `apps/web/src/app/(dashboard)/layout.tsx` (dashboard metadata)

- [ ] **Step 1: Fix "/mes" → "/mês" in pricing-card.tsx**

In `apps/web/src/features/marketing/components/pricing-card.tsx`, line 107:

```tsx
// OLD
<span className="text-sm text-slate-500">/mes</span>

// NEW
<span className="text-sm text-slate-500">/mês</span>
```

- [ ] **Step 2: Add © symbol in marketing-footer.tsx**

In `apps/web/src/features/marketing/components/marketing-footer.tsx`, line 35:

```tsx
// OLD
<p className="text-sm text-slate-500">{currentYear} Bens Seguros</p>

// NEW
<p className="text-sm text-slate-500">© {currentYear} Bens Seguros</p>
```

- [ ] **Step 3: Change "Contato" link from #faq to #contato in marketing-nav.tsx**

In `apps/web/src/features/marketing/components/marketing-nav.tsx`, line 19:

```tsx
// OLD
{ label: 'Contato', href: '/#faq' },

// NEW
{ label: 'Contato', href: '/#contato' },
```

Also in `marketing-footer.tsx`, line 7:

```tsx
// OLD
{ label: 'Contato', href: '/#faq' },

// NEW
{ label: 'Contato', href: '/#contato' },
```

Add `id="contato"` to the CTA section at the bottom of the landing page (the "Pronto para transformar sua corretora?" section).

Also fix Enterprise CTA in `pricing-section.tsx` — change `ctaHref: '#faq'` to `ctaHref: '#contato'`.

- [ ] **Step 4: Add metadata template for dynamic page titles**

In `apps/web/src/app/layout.tsx`, update the metadata:

```tsx
export const metadata: Metadata = {
  title: {
    default: 'Bens Seguros',
    template: '%s | Bens Seguros',
  },
  description: 'ERP para Corretoras de Seguros',
}
```

Then add `metadata` exports to key dashboard pages:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`: `export const metadata = { title: 'Dashboard' }`
- `apps/web/src/app/(dashboard)/clients/page.tsx`: `export const metadata = { title: 'Clientes' }`
- `apps/web/src/app/(dashboard)/proposals/page.tsx`: `export const metadata = { title: 'Propostas' }`
- `apps/web/src/app/(dashboard)/policies/page.tsx`: `export const metadata = { title: 'Apólices' }`
- `apps/web/src/app/(dashboard)/claims/page.tsx`: `export const metadata = { title: 'Sinistros' }`
- `apps/web/src/app/(dashboard)/commissions/page.tsx`: `export const metadata = { title: 'Comissões' }`
- `apps/web/src/app/(dashboard)/settings/page.tsx`: `export const metadata = { title: 'Configurações' }`
- `apps/web/src/app/(dashboard)/audit/page.tsx`: `export const metadata = { title: 'Auditoria' }`
- `apps/web/src/app/(dashboard)/chat/page.tsx`: `export const metadata = { title: 'Chat' }`

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/features/marketing/ apps/web/src/app/
git commit -m "fix: landing page text — accent on /mês, © symbol, contato link, page titles"
```

---

### Task 2: Fix register form validation issues (A-1, A-2)

**Files:**

- Modify: `apps/web/src/features/auth/components/register-form.tsx:17-33,128-134`

- [ ] **Step 1: Fix Zod schema for confirmPassword**

In `apps/web/src/features/auth/components/register-form.tsx`, change line 22:

```tsx
// OLD
confirmPassword: z.string().min(8, 'Mínimo 8 caracteres'),

// NEW
confirmPassword: z.string().min(1, 'Confirme sua senha'),
```

This makes the confirmPassword field show "Confirme sua senha" when empty (instead of "Mínimo 8 caracteres"). The `.refine()` at line 29 already handles the mismatch case with "Senhas não conferem".

- [ ] **Step 2: Hide helper text when error is shown on password field**

In `apps/web/src/features/auth/components/register-form.tsx`, replace lines 129-134:

```tsx
// OLD
;<p className="text-xs text-slate-500">Mínimo de 8 caracteres</p>
{
  form.formState.errors.password && (
    <p role="alert" className="text-destructive text-sm">
      {form.formState.errors.password.message}
    </p>
  )
}

// NEW
{
  form.formState.errors.password ? (
    <p role="alert" className="text-destructive text-sm">
      {form.formState.errors.password.message}
    </p>
  ) : (
    <p className="text-xs text-slate-500">Mínimo de 8 caracteres</p>
  )
}
```

- [ ] **Step 3: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/features/auth/
git commit -m "fix: register form — hide helper when error shown, better confirmPassword message"
```

---

### Task 3: Fix dashboard KPI cards overflow (D-2)

**Files:**

- Modify: `apps/web/src/features/dashboard/components/comparison-stat-card.tsx:51-53`
- Modify: `apps/web/src/features/dashboard/components/stats-cards.tsx:38`

- [ ] **Step 1: Add text truncation to value in ComparisonStatCard**

In `apps/web/src/features/dashboard/components/comparison-stat-card.tsx`, line 51-53:

```tsx
// OLD
<div className="min-w-0 flex-1">
  <p className="text-muted-foreground text-sm">{title}</p>
  <p className="text-2xl font-semibold tracking-tight">{value}</p>

// NEW
<div className="min-w-0 flex-1">
  <p className="text-muted-foreground truncate text-sm">{title}</p>
  <p className="truncate text-2xl font-semibold tracking-tight" title={String(value)}>{value}</p>
```

- [ ] **Step 2: Change grid to allow wrapping on tight viewports**

In `apps/web/src/features/dashboard/components/stats-cards.tsx`, line 38:

```tsx
// OLD
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

// NEW
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
```

This ensures at 1024-1279px (lg) the cards get 3 columns instead of being squeezed into 5.

- [ ] **Step 3: Handle first-time +100% display (D-3)**

In `apps/web/src/features/dashboard/components/comparison-stat-card.tsx`, update the showComparison logic (line 41-43):

```tsx
// OLD
const isPositive = comparison ? comparison.changePercent >= 0 : true
const showComparison =
  comparison && (comparison.current > 0 || comparison.previous > 0)

// NEW
const hasHistory = comparison && comparison.previous > 0
const isPositive = comparison ? comparison.changePercent >= 0 : true
const showComparison = comparison && hasHistory
```

This hides the "+100% vs anterior" when there's no previous period data (previous === 0), which is the seed data case.

- [ ] **Step 4: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/features/dashboard/
git commit -m "fix: dashboard KPI cards — prevent overflow, responsive grid, hide first-time comparison"
```

---

### Task 4: Fix Kanban missing columns and premium sums (T-2, T-3)

**Files:**

- Modify: `apps/web/src/features/proposals/components/proposal-kanban.tsx:123-124`
- Modify: `apps/web/src/features/proposals/components/kanban-column.tsx:52-67`
- Modify: `apps/web/src/features/proposals/components/kanban-card.tsx:78-81`

- [ ] **Step 1: Filter POLICY_ISSUED from visible Kanban stages**

The `STAGES` constant already includes all 7 stages including PAYMENT and LOST. The Kanban should show pipeline stages only (not terminal ones). In `apps/web/src/features/proposals/components/proposal-kanban.tsx`, after line 123:

```tsx
// OLD
const visibleStages = boardType === 'ENDORSEMENT' ? ENDORSEMENT_STAGES : STAGES

// NEW
const KANBAN_STAGES: readonly ProposalStage[] = [
  'CAPTURE',
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
] as const

const visibleStages =
  boardType === 'ENDORSEMENT' ? ENDORSEMENT_STAGES : KANBAN_STAGES
```

Move the constant outside the component (before the function) to avoid recreating on every render.

- [ ] **Step 2: Add premium sum to Kanban column header**

In `apps/web/src/features/proposals/components/kanban-column.tsx`, add import and compute sum:

```tsx
import { formatCurrency } from '@/lib/formatters'
```

After line 47 (computing proposals), add:

```tsx
const totalPremium = proposals.reduce(
  (sum, p) => sum + (p.premiumValueInCents ?? 0),
  0
)
```

Then update the header section (lines 52-67) to include the sum:

```tsx
;<div className="flex items-center gap-2 border-b px-3 py-2.5">
  <span
    className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STAGE_COLORS[stage])}
    aria-hidden="true"
  />
  <span className="truncate text-sm font-medium">{STAGE_LABELS[stage]}</span>
  <Badge variant="secondary" size="sm" className="ml-auto tabular-nums">
    {proposals.length}
  </Badge>
</div>
{
  proposals.length > 0 && (
    <div className="text-muted-foreground border-b px-3 py-1.5 text-xs">
      {formatCurrency(totalPremium)}
    </div>
  )
}
```

- [ ] **Step 3: Add tooltip to truncated salesperson name in kanban-card**

In `apps/web/src/features/proposals/components/kanban-card.tsx`, lines 78-81:

```tsx
// OLD
{
  proposal.salespersonName && (
    <span className="text-muted-foreground max-w-[80px] truncate text-xs">
      {proposal.salespersonName}
    </span>
  )
}

// NEW
{
  proposal.salespersonName && (
    <span
      className="text-muted-foreground max-w-[100px] truncate text-xs"
      title={proposal.salespersonName}
    >
      {proposal.salespersonName}
    </span>
  )
}
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/features/proposals/
git commit -m "fix: kanban — show PAYMENT column, add premium sums, tooltip on truncated names"
```

---

### Task 5: Fix mobile toolbar button truncation (M-1, M-2)

**Files:**

- Modify: `apps/web/src/features/clients/components/clients-toolbar.tsx:76-83`
- Modify: `apps/web/src/features/dashboard/components/dashboard-content.tsx` (Exportar PDF button)
- Modify: `apps/web/src/features/proposals/components/proposals-table-toolbar.tsx`
- Modify: `apps/web/src/features/assistances/components/assistances-toolbar.tsx`
- Modify: `apps/web/src/features/claims/components/claims-toolbar.tsx`

- [ ] **Step 1: Make "Novo Cliente" button icon-only on mobile**

In `apps/web/src/features/clients/components/clients-toolbar.tsx`, lines 79-82:

```tsx
// OLD
<Button onClick={onNewClient}>
  <Plus className="mr-2 h-4 w-4" />
  Novo Cliente
</Button>

// NEW
<Button onClick={onNewClient}>
  <Plus className="h-4 w-4 sm:mr-2" />
  <span className="hidden sm:inline">Novo Cliente</span>
</Button>
```

- [ ] **Step 2: Apply same pattern to all "New" buttons across toolbars**

Apply the same `hidden sm:inline` pattern on the text span for:

- `assistances-toolbar.tsx` — "Nova Assistência" button
- `claims-toolbar.tsx` — "Novo Sinistro" button
- `proposals-table-toolbar.tsx` — "Nova Proposta" button

Each follows the same pattern:

```tsx
<Plus className="h-4 w-4 sm:mr-2" />
<span className="hidden sm:inline">[Button Text]</span>
```

- [ ] **Step 3: Fix dashboard "Exportar PDF" button on mobile**

Find the dashboard toolbar/filters component that renders "Exportar PDF". Apply:

```tsx
<Button variant="outline" size="sm" ...>
  <Download className="h-4 w-4 sm:mr-2" />
  <span className="hidden sm:inline">Exportar PDF</span>
</Button>
```

Also wrap the time filter buttons (7 dias, 30 dias, etc.) in an overflow-x-auto container:

```tsx
<div className="flex items-center gap-2 overflow-x-auto">
  {/* time filter buttons */}
</div>
```

- [ ] **Step 4: Hide "Importar" and "Exportar CSV" text on mobile in clients toolbar**

In `clients-toolbar.tsx`, the secondary buttons (Import/Export) should also hide text on mobile:

```tsx
// ClientImportButton and ClientExportButton should receive a className prop
// or internally use hidden sm:inline on their text labels
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/features/
git commit -m "fix: mobile toolbar buttons — icon-only on small screens"
```

---

### Task 6: Add missing tabs to client detail page (F-1, F-2)

**Files:**

- Modify: `apps/web/src/features/clients/components/client-detail.tsx:95-165`

- [ ] **Step 1: Add avatar/initials to header card**

In `apps/web/src/features/clients/components/client-detail.tsx`, add an Avatar component before the client name. Import Avatar from shadcn/ui and add:

```tsx
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
```

In the header section (around line 100-105), before the name, add:

```tsx
<div className="flex items-start gap-4">
  <Avatar className="h-12 w-12">
    <AvatarFallback className="text-lg">
      {client.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()}
    </AvatarFallback>
  </Avatar>
  <div>{/* existing name + badge + document */}</div>
</div>
```

- [ ] **Step 2: Add Propostas, Apólices, and Histórico tabs**

In `apps/web/src/features/clients/components/client-detail.tsx`, replace lines 155-164:

```tsx
// OLD
<Tabs defaultValue="documents">
  <TabsList>
    <TabsTab value="documents">Documentos</TabsTab>
  </TabsList>
  <TabsContent value="documents" className="mt-4 space-y-4">
    <DocumentUpload entityType="CLIENT" entityId={clientId} />
    <DocumentList entityType="CLIENT" entityId={clientId} />
  </TabsContent>
</Tabs>

// NEW
<Tabs defaultValue="documents">
  <TabsList>
    <TabsTab value="proposals">Propostas</TabsTab>
    <TabsTab value="policies">Apólices</TabsTab>
    <TabsTab value="documents">Documentos</TabsTab>
    <TabsTab value="history">Histórico</TabsTab>
  </TabsList>

  <TabsContent value="proposals" className="mt-4">
    <ClientProposalsTab clientId={clientId} />
  </TabsContent>

  <TabsContent value="policies" className="mt-4">
    <ClientPoliciesTab clientId={clientId} />
  </TabsContent>

  <TabsContent value="documents" className="mt-4 space-y-4">
    <DocumentUpload entityType="CLIENT" entityId={clientId} />
    <DocumentList entityType="CLIENT" entityId={clientId} />
  </TabsContent>

  <TabsContent value="history" className="mt-4">
    <ClientHistoryTab clientId={clientId} />
  </TabsContent>
</Tabs>
```

- [ ] **Step 3: Create ClientProposalsTab component**

Create `apps/web/src/features/clients/components/client-proposals-tab.tsx`:

This component fetches proposals filtered by clientId using the Orval-generated hooks and renders them in a simple table (number, branch, stage badge, value, date). If empty, show contextual empty state.

- [ ] **Step 4: Create ClientPoliciesTab component**

Create `apps/web/src/features/clients/components/client-policies-tab.tsx`:

Similar to proposals tab — fetches policies for this client and shows a table (number, branch, status, value, vigência). Empty state if none.

- [ ] **Step 5: Create ClientHistoryTab component**

Create `apps/web/src/features/clients/components/client-history-tab.tsx`:

Fetches audit logs filtered by entity CLIENT + clientId. Shows timeline/list of actions (date, action, user). Empty state if none.

- [ ] **Step 6: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/features/clients/
git commit -m "feat: client detail — add Propostas, Apólices, Histórico tabs + avatar"
```

---

### Task 7: Fix settings mobile tab overflow (S-1)

**Files:**

- Modify: `apps/web/src/features/channels/components/settings-layout.tsx:69`

- [ ] **Step 1: Add horizontal scroll on mobile for settings nav**

In `apps/web/src/features/channels/components/settings-layout.tsx`, line 69:

```tsx
// OLD
className = 'flex flex-row gap-1 lg:w-56 lg:shrink-0 lg:flex-col'

// NEW
className =
  'flex flex-row gap-1 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col'
```

Also add `shrink-0` to each nav item text to prevent wrapping on mobile. In the `SettingsNavItem` component, update the container:

```tsx
// Add whitespace-nowrap on mobile
className = '... whitespace-nowrap lg:whitespace-normal'
```

- [ ] **Step 2: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/features/channels/
git commit -m "fix: settings mobile — horizontal scroll for nav tabs"
```

---

### Task 8: Fix audit page subtitle (T-6)

**Files:**

- Modify: `apps/web/src/app/(dashboard)/audit/page.tsx:5-7`

- [ ] **Step 1: Add subtitle to audit page**

In `apps/web/src/app/(dashboard)/audit/page.tsx`:

```tsx
// OLD
<div className="space-y-6">
  <h1 className="text-2xl font-semibold">Auditoria</h1>
  <AuditContent />
</div>

// NEW
<div className="space-y-6">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
    <p className="text-muted-foreground text-sm">
      Registro de atividades e alterações da organização.
    </p>
  </div>
  <AuditContent />
</div>
```

- [ ] **Step 2: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/app/\(dashboard\)/audit/
git commit -m "fix: audit page — add descriptive subtitle"
```

---

### Task 9: Fix assistances empty state CTA (T-5)

**Files:**

- Modify: `apps/web/src/features/assistances/components/assistances-table.tsx` (empty state section)

- [ ] **Step 1: Find the empty state in assistances table body and add CTA**

Locate the empty state rendering (the part that shows icon + "Nenhuma assistência encontrada" + description). Add a CTA button below the description:

```tsx
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

// In the empty state section:
;<div className="flex flex-col items-center justify-center py-12">
  {/* existing icon */}
  <p className="text-muted-foreground mt-2 font-medium">
    Nenhuma assistência encontrada
  </p>
  <p className="text-muted-foreground mt-1 text-sm">
    Registre sua primeira assistência para começar.
  </p>
  <Button className="mt-4" onClick={onNewAssistance}>
    <Plus className="mr-2 h-4 w-4" />
    Nova Assistência
  </Button>
</div>
```

The `onNewAssistance` callback needs to be threaded from the parent. Check how the toolbar "Nova Assistência" button triggers the sheet and replicate.

- [ ] **Step 2: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/features/assistances/
git commit -m "fix: assistances empty state — add CTA button"
```

---

### Task 10: Fix mobile table — add expand inline (M-4, T-1)

**Files:**

- Modify: `apps/web/src/features/clients/components/clients-table-rows.tsx`
- Potentially modify: other table row components for consistency

- [ ] **Step 1: Add expandable row state to clients table**

In the clients table rows component, add a `useState` for expanded row IDs. On mobile (use `useMediaQuery` or Tailwind responsive rendering), show a chevron button in the last column that toggles an expanded detail section below the row.

```tsx
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

const toggleRow = (id: string) => {
  setExpandedRows((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}
```

- [ ] **Step 2: Render hidden columns in expanded section on mobile**

For each row, after the main `<TableRow>`, conditionally render an expanded detail section that shows the columns hidden on mobile (Documento, E-mail, Telefone, Criado em):

```tsx
{
  expandedRows.has(client.id) && (
    <TableRow className="bg-muted/30 sm:hidden">
      <TableCell colSpan={3}>
        <div className="space-y-2 py-2 text-sm">
          <div>
            <span className="text-muted-foreground">Documento:</span>{' '}
            {client.document}
          </div>
          <div>
            <span className="text-muted-foreground">E-mail:</span>{' '}
            {client.email}
          </div>
          <div>
            <span className="text-muted-foreground">Telefone:</span>{' '}
            {client.phone}
          </div>
          <div>
            <span className="text-muted-foreground">Criado em:</span>{' '}
            {formatDate(client.createdAt)}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
```

- [ ] **Step 3: Add chevron toggle button visible only on mobile**

In the mobile-visible columns, add a ChevronDown/ChevronUp button:

```tsx
<TableCell className="w-8 sm:hidden">
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8"
    onClick={(e) => {
      e.stopPropagation()
      toggleRow(client.id)
    }}
    aria-label={
      expandedRows.has(client.id) ? 'Recolher detalhes' : 'Expandir detalhes'
    }
  >
    <ChevronDown
      className={cn(
        'h-4 w-4 transition-transform',
        expandedRows.has(client.id) && 'rotate-180'
      )}
    />
  </Button>
</TableCell>
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/features/clients/
git commit -m "feat: clients table — expandable rows on mobile with hidden column details"
```

---

### Task 11: Add table row accessibility (AC-1)

**Files:**

- Modify: `apps/web/src/components/ui/table.tsx` (TableRow)

- [ ] **Step 1: Add clickable variant to TableRow**

In `apps/web/src/components/ui/table.tsx`, update the TableRow component to accept an optional `onClick` and apply cursor-pointer + hover styles:

The table.tsx likely already has hover styles. Verify that clickable rows have `cursor-pointer` and `role="link"` or `tabIndex={0}`. Check the current implementation and add if missing:

```tsx
// In TableRow, if onClick is provided:
className={cn(
  '...existing classes...',
  onClick && 'cursor-pointer'
)}
```

This is likely already partially implemented since rows navigate on click. Verify and fix if needed.

- [ ] **Step 2: Verify and commit**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

```bash
git add apps/web/src/components/ui/table.tsx
git commit -m "fix: table row accessibility — cursor-pointer on clickable rows"
```

---

### Task 12: Final quality gate

- [ ] **Step 1: Run full quality gate**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

All must pass.

- [ ] **Step 2: Visual verification with Playwright**

Start servers and re-test critical pages with Playwright to confirm fixes:

- Landing page: /mês, ©, Contato link
- Register: password validation
- Dashboard: KPI cards at 1440px
- Kanban: PAYMENT column visible, premium sums
- Mobile 375px: buttons icon-only, table expand
- Client detail: 4 tabs + avatar
- Settings mobile: tabs scrollable

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: finalize UX audit fixes — visual verification pass"
```
