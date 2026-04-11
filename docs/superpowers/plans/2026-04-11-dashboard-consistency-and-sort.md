# Dashboard Consistency & Server-Side Sort — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver o drift de consistência do dashboard (header unificado, breadcrumbs, metadata, casing dos CTAs) E consertar o bug de sorting client-side em `proposals` e `insurers`.

**Architecture:** Dois PRs paralelos executados em sequência. **Part A = PR 2 (consistency)** primeiro (frontend-only, baixo risco, extrai `ListPageHeader` compartilhado). **Part B = PR 1 (server-side sort)** depois (toca backend + Orval + frontend; rebaseia sobre Part A).

**Tech Stack:** Next.js 16 (App Router + RSC), React 19, TanStack Table v8, Fastify 5 + Zod, Prisma 7, shadcn/ui (@coss/style), Orval (React Query codegen), TypeScript 5.9 strict

**Spec:** `docs/superpowers/specs/2026-04-11-dashboard-consistency-and-sort-fix-design.md`

**Reference pattern:** `apps/server/src/routes/v1/clients/_schemas.ts` (sort), `apps/web/src/features/clients/components/clients-table.tsx` (manualSorting), `apps/web/src/app/(dashboard)/policies/page.tsx` (breadcrumb + header markup).

---

## Execution order overview

```
Part A: feat/dashboard-list-page-header
  ├── A.1 Create ListPageHeader component
  ├── A.2-A.11 Refactor each page to use it
  ├── A.12 Quality gates + open PR
  ├── A.13 Code review (subagent)
  └── A.14 QA Playwright + merge

Part B: feat/sort-proposals-insurers   (after Part A merged)
  ├── B.1-B.4 Backend: proposals (repo → use case → route → schema)
  ├── B.5-B.8 Backend: insurers (repo → use case → route → schema)
  ├── B.9 Regenerate Orval
  ├── B.10-B.13 Frontend: hooks + tables for both modules
  ├── B.14 Quality gates + open PR
  ├── B.15 Code review (subagent)
  └── B.16 QA Playwright + merge
```

---

# PART A — Consistency PR (`feat/dashboard-list-page-header`)

## Task A.1: Create `ListPageHeader` component

**Files:**

- Create: `apps/web/src/components/shared/list-page-header.tsx`

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull && git checkout -b feat/dashboard-list-page-header
```

- [ ] **Step 2: Create the component**

```tsx
// apps/web/src/components/shared/list-page-header.tsx
import type { ReactNode } from 'react'

import {
  PageBreadcrumb,
  type BreadcrumbItem,
} from '@/components/page-breadcrumb'

interface ListPageHeaderProps {
  readonly breadcrumb: readonly BreadcrumbItem[]
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
}

export function ListPageHeader({
  breadcrumb,
  title,
  description,
  action,
}: ListPageHeaderProps) {
  return (
    <div className="space-y-4">
      <PageBreadcrumb items={breadcrumb} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify `BreadcrumbItem` is exported**

Run: `grep -n "export.*BreadcrumbItem" apps/web/src/components/page-breadcrumb.tsx`
If not exported, open the file and add `export` to the `BreadcrumbItem` type. If the type has a different name, adjust the import in `list-page-header.tsx`.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @app/web typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/list-page-header.tsx apps/web/src/components/page-breadcrumb.tsx
git commit -m "feat(web): add ListPageHeader shared component"
```

---

## Task A.2: Migrate `clients/page.tsx` to `ListPageHeader`

**Files:**

- Modify: `apps/web/src/app/(dashboard)/clients/page.tsx`

- [ ] **Step 1: Replace the inline header markup**

Replace the entire file body with:

```tsx
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { Button } from '@/components/ui/button'
import { ClientsContent } from '@/features/clients/components/clients-table'

export const metadata: Metadata = { title: 'Clientes' }

export default function ClientsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clientes' },
        ]}
        title="Clientes"
        description="Gerencie sua base de clientes e leads."
        action={
          <Button render={<Link href="/clients/new" />}>
            <Plus className="size-4" />
            Novo Cliente
          </Button>
        }
      />
      <ClientsContent />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @app/web typecheck && pnpm --filter @app/web lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/clients/page.tsx
git commit -m "refactor(web): use ListPageHeader in clients page"
```

---

## Task A.3: Migrate `policies/page.tsx`

**Files:**

- Modify: `apps/web/src/app/(dashboard)/policies/page.tsx`

- [ ] **Step 1: Replace file body**

```tsx
import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { PoliciesTable } from '@/features/policies/components/policies-table'

export const metadata: Metadata = { title: 'Apólices' }

export default function PoliciesPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Apólices' },
        ]}
        title="Apólices"
        description="Apólices de seguro emitidas."
      />
      <PoliciesTable />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @app/web typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/policies/page.tsx
git commit -m "refactor(web): use ListPageHeader in policies page"
```

---

## Task A.4: Migrate `commissions/page.tsx`

**Files:**

- Modify: `apps/web/src/app/(dashboard)/commissions/page.tsx`

- [ ] **Step 1: Replace file body**

```tsx
import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'

import { CommissionsContent } from './commissions-content'

export const metadata: Metadata = { title: 'Comissões' }

export default function CommissionsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Comissões' },
        ]}
        title="Comissões"
        description="Gerenciamento de comissões e aprovações."
      />
      <CommissionsContent />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @app/web typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/commissions/page.tsx
git commit -m "refactor(web): use ListPageHeader in commissions page"
```

---

## Task A.5: Migrate `audit/page.tsx` (gains breadcrumb)

**Files:**

- Modify: `apps/web/src/app/(dashboard)/audit/page.tsx`

- [ ] **Step 1: Replace file body**

```tsx
import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { AuditTable } from '@/features/audit/components/audit-table'

export const metadata: Metadata = { title: 'Auditoria' }

export default function AuditPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Auditoria' },
        ]}
        title="Auditoria"
        description="Registro de atividades e alterações da organização."
      />
      <AuditTable />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @app/web typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/audit/page.tsx
git commit -m "refactor(web): use ListPageHeader in audit page (adds breadcrumb)"
```

---

## Task A.6: Migrate `proposals/page.tsx` + move CTA into header

**Files:**

- Modify: `apps/web/src/app/(dashboard)/proposals/page.tsx`
- Modify: `apps/web/src/features/proposals/components/proposals-table.tsx` (remove CTA from toolbar)
- Modify: `apps/web/src/features/proposals/components/proposals-toolbar-actions.tsx` (if CTA lives there — remove it)

- [ ] **Step 1: Read current proposals page**

Run: `cat apps/web/src/app/(dashboard)/proposals/page.tsx`
Note the current imports and any `ProposalsContent`/`ProposalsTable` wrapper.

- [ ] **Step 2: Replace page body**

```tsx
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { Button } from '@/components/ui/button'
import { ProposalsContent } from '@/features/proposals/components/proposals-table'

export const metadata: Metadata = { title: 'Propostas' }

export default function ProposalsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Propostas' },
        ]}
        title="Propostas"
        description="Pipeline de propostas de seguro."
        action={
          <Button render={<Link href="/proposals/new" />}>
            <Plus className="size-4" />
            Nova Proposta
          </Button>
        }
      />
      <ProposalsContent />
    </div>
  )
}
```

If the current page exports `ProposalsTable` instead of `ProposalsContent`, keep the same name the current file uses. Adjust import accordingly.

- [ ] **Step 3: Remove "Nova proposta" CTA from the proposals table toolbar**

Open `apps/web/src/features/proposals/components/proposals-table.tsx` (and `proposals-toolbar-actions.tsx` if the CTA lives there). Locate the button with text containing "Nova proposta" / "Nova Proposta" — delete only that button JSX and any unused imports (`Plus`, `Link`, `Button` if no longer used in the file).

Run: `grep -n "Nova proposta\|Nova Proposta" apps/web/src/features/proposals/components/`
Expected after removal: only matches in `page.tsx`.

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm --filter @app/web typecheck && pnpm --filter @app/web lint`
Expected: clean. Fix any unused-import warnings that appear.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/proposals/page.tsx apps/web/src/features/proposals/components/
git commit -m "refactor(web): move proposals CTA to ListPageHeader"
```

---

## Task A.7: Migrate `insurers` — create `InsurerCreateButton`

**Files:**

- Create: `apps/web/src/features/insurers/components/insurer-create-button.tsx`
- Modify: `apps/web/src/app/(dashboard)/insurers/page.tsx`
- Modify: `apps/web/src/features/insurers/components/insurers-table.tsx` (remove CTA from toolbar)

- [ ] **Step 1: Inspect existing dialog wiring**

Run: `grep -n "InsurerFormDialog\|Nova seguradora\|Nova Seguradora" apps/web/src/features/insurers/components/*.tsx`

The existing `insurers-table.tsx` opens `InsurerFormDialog` via a local `useState`. We will lift that into a new client component.

- [ ] **Step 2: Create the button component**

```tsx
// apps/web/src/features/insurers/components/insurer-create-button.tsx
'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { InsurerFormDialog } from './insurer-form-dialog'

export function InsurerCreateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nova Seguradora
      </Button>
      <InsurerFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
```

If `InsurerFormDialog` does not accept `open`/`onOpenChange` props today, check its current prop shape first (`grep -n "interface.*InsurerFormDialog" apps/web/src/features/insurers/components/insurer-form-dialog.tsx`). If it uses a different prop name (e.g. `isOpen`/`setIsOpen`), use those exact names in the button component.

- [ ] **Step 3: Replace `insurers/page.tsx`**

```tsx
import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { InsurerCreateButton } from '@/features/insurers/components/insurer-create-button'
import { InsurersTable } from '@/features/insurers/components/insurers-table'

export const metadata: Metadata = { title: 'Seguradoras' }

export default function InsurersPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Seguradoras' },
        ]}
        title="Seguradoras"
        description="Gerencie as seguradoras disponíveis para propostas, apólices e sinistros."
        action={<InsurerCreateButton />}
      />
      <InsurersTable />
    </div>
  )
}
```

If the current page file has different existing markup or imports, preserve unrelated sections (rare for this page).

- [ ] **Step 4: Remove the "Nova seguradora" CTA + dialog state from `insurers-table.tsx`**

In `insurers-table.tsx`, delete:

- the `<Button>` that creates a new insurer
- the local `useState` for the dialog open/closed
- the `<InsurerFormDialog>` JSX that was triggered from the table
- any now-unused imports (`Plus`, `Button`, `useState`, `InsurerFormDialog`)

Keep the `<InsurerFormDialog>` used for **editing** an existing insurer (if present) — only remove the "create" dialog usage.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm --filter @app/web typecheck && pnpm --filter @app/web lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/insurers/ apps/web/src/app/(dashboard)/insurers/page.tsx
git commit -m "refactor(web): extract InsurerCreateButton, move CTA to header"
```

---

## Task A.8: Migrate `claims` — create `ClaimCreateButton`

**Files:**

- Create: `apps/web/src/features/claims/components/claim-create-button.tsx`
- Modify: `apps/web/src/app/(dashboard)/claims/page.tsx`
- Modify: `apps/web/src/features/claims/components/claims-table.tsx`

- [ ] **Step 1: Check how claims creation is triggered today**

Run: `grep -rn "Novo Sinistro\|ClaimFormDialog\|/claims/new" apps/web/src/features/claims/ apps/web/src/app/(dashboard)/claims/`

Two possibilities:

- (a) Link to `/claims/new` (navigation) — the button is a `<Link>`
- (b) Dialog — uses `useState` + a form dialog component

Use the pattern that matches reality. Below shows **both** variants — keep the correct one.

- [ ] **Step 2a: If claims creation is a navigation to `/claims/new`**

```tsx
// apps/web/src/features/claims/components/claim-create-button.tsx
import { Plus } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function ClaimCreateButton() {
  return (
    <Button render={<Link href="/claims/new" />}>
      <Plus className="size-4" />
      Novo Sinistro
    </Button>
  )
}
```

- [ ] **Step 2b: If claims creation opens a dialog**

Mirror `InsurerCreateButton` pattern from Task A.7 Step 2, replacing `InsurerFormDialog` with the actual dialog component (e.g. `ClaimFormDialog`).

- [ ] **Step 3: Update `claims/page.tsx`**

```tsx
import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { ClaimCreateButton } from '@/features/claims/components/claim-create-button'
import { ClaimsTable } from '@/features/claims/components/claims-table'

export const metadata: Metadata = { title: 'Sinistros' }

export default function ClaimsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sinistros' },
        ]}
        title="Sinistros"
        description="Gerenciamento de sinistros e acompanhamento de ocorrências."
        action={<ClaimCreateButton />}
      />
      <ClaimsTable />
    </div>
  )
}
```

If `claims-table.tsx` exports a different wrapper name (e.g. `ClaimsContent`), use that.

- [ ] **Step 4: Remove CTA from `claims-table.tsx`**

Delete the "Novo Sinistro" button from the toolbar and any unused imports, including any associated dialog `useState` if present.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm --filter @app/web typecheck && pnpm --filter @app/web lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/claims/ apps/web/src/app/(dashboard)/claims/page.tsx
git commit -m "refactor(web): extract ClaimCreateButton with Plus icon"
```

---

## Task A.9: Migrate `assistances` — create `AssistanceCreateButton`

**Files:**

- Create: `apps/web/src/features/assistances/components/assistance-create-button.tsx`
- Modify: `apps/web/src/app/(dashboard)/assistances/page.tsx`
- Modify: `apps/web/src/features/assistances/components/assistances-table.tsx`

- [ ] **Step 1: Check current creation flow**

Run: `grep -rn "Nova Assistência\|AssistanceFormDialog\|/assistances/new" apps/web/src/features/assistances/ apps/web/src/app/(dashboard)/assistances/`

- [ ] **Step 2: Create button (use the variant that matches reality — navigation or dialog, same pattern as Task A.8)**

Navigation variant:

```tsx
// apps/web/src/features/assistances/components/assistance-create-button.tsx
import { Plus } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function AssistanceCreateButton() {
  return (
    <Button render={<Link href="/assistances/new" />}>
      <Plus className="size-4" />
      Nova Assistência
    </Button>
  )
}
```

- [ ] **Step 3: Update `assistances/page.tsx`**

```tsx
import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { AssistanceCreateButton } from '@/features/assistances/components/assistance-create-button'
import { AssistancesTable } from '@/features/assistances/components/assistances-table'

export const metadata: Metadata = { title: 'Assistências' }

export default function AssistancesPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assistências' },
        ]}
        title="Assistências"
        description="Gerenciamento de assistências e acompanhamento de prestadores."
        action={<AssistanceCreateButton />}
      />
      <AssistancesTable />
    </div>
  )
}
```

- [ ] **Step 4: Remove CTA from `assistances-table.tsx`**

Delete the "Nova Assistência" button and any unused state/imports.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm --filter @app/web typecheck && pnpm --filter @app/web lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/assistances/ apps/web/src/app/(dashboard)/assistances/page.tsx
git commit -m "refactor(web): extract AssistanceCreateButton with Plus icon"
```

---

## Task A.10: Convert `endorsements/page.tsx` to RSC with metadata

**Files:**

- Create: `apps/web/src/features/endorsements/components/endorsements-content.tsx`
- Modify: `apps/web/src/app/(dashboard)/endorsements/page.tsx`

- [ ] **Step 1: Ensure features/endorsements directory exists**

Run: `mkdir -p apps/web/src/features/endorsements/components`

- [ ] **Step 2: Create the client content component**

```tsx
// apps/web/src/features/endorsements/components/endorsements-content.tsx
'use client'

import dynamic from 'next/dynamic'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { Skeleton } from '@/components/ui/skeleton'

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-3">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}

const ProposalKanban = dynamic(
  () =>
    import('@/features/proposals/components/proposal-kanban').then(
      (m) => m.ProposalKanban
    ),
  {
    loading: () => <KanbanSkeleton />,
    ssr: false,
  }
)

export function EndorsementsContent() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Endossos' },
        ]}
        title="Endossos"
        description="Pipeline operacional de endossos vinculados a apólices em vigor."
      />
      <ProposalKanban
        initialBoardType="ENDORSEMENT"
        allowedBoardTypes={['ENDORSEMENT']}
        searchPlaceholder="Buscar por apólice ou segurado..."
      />
    </div>
  )
}
```

- [ ] **Step 3: Replace `endorsements/page.tsx`**

```tsx
import type { Metadata } from 'next'

import { EndorsementsContent } from '@/features/endorsements/components/endorsements-content'

export const metadata: Metadata = { title: 'Endossos' }

export default function EndorsementsPage() {
  return <EndorsementsContent />
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm --filter @app/web typecheck && pnpm --filter @app/web lint`
Expected: clean. If `ProposalKanban` props have changed (`initialBoardType`, `allowedBoardTypes`, `searchPlaceholder`) from the current file, copy them 1:1.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/endorsements/ apps/web/src/app/(dashboard)/endorsements/page.tsx
git commit -m "refactor(web): convert endorsements page to RSC with metadata"
```

---

## Task A.11: Convert `chat/page.tsx` to RSC with metadata

**Files:**

- Create: `apps/web/src/features/chat/components/chat-layout-content.tsx`
- Modify: `apps/web/src/app/(dashboard)/chat/page.tsx`

> Chat is intentionally **not** using `ListPageHeader` — its UX is a full-height split layout with its own internal header. This task only fixes the metadata bug.

- [ ] **Step 1: Create the client content wrapper**

```tsx
// apps/web/src/features/chat/components/chat-layout-content.tsx
'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

function ChatLayoutSkeleton() {
  return (
    <div className="bg-background flex h-full w-full overflow-hidden">
      <div className="hidden w-80 shrink-0 border-r md:block lg:w-96">
        <div className="space-y-3 p-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="mt-4 h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
    </div>
  )
}

const ChatLayout = dynamic(
  () =>
    import('@/features/chat/components/chat-layout').then((m) => m.ChatLayout),
  {
    loading: () => <ChatLayoutSkeleton />,
    ssr: false,
  }
)

export function ChatLayoutContent() {
  return (
    <div className="-m-4 h-[calc(100vh-3.5rem)] sm:-m-6">
      <ChatLayout />
    </div>
  )
}
```

- [ ] **Step 2: Replace `chat/page.tsx`**

```tsx
import type { Metadata } from 'next'

import { ChatLayoutContent } from '@/features/chat/components/chat-layout-content'

export const metadata: Metadata = { title: 'Chat' }

export default function ChatPage() {
  return <ChatLayoutContent />
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm --filter @app/web typecheck && pnpm --filter @app/web lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/chat/components/chat-layout-content.tsx apps/web/src/app/(dashboard)/chat/page.tsx
git commit -m "refactor(web): convert chat page to RSC with metadata"
```

---

## Task A.12: Quality gates + open PR

- [ ] **Step 1: Full quality gates from repo root**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Expected: all four green.

- [ ] **Step 2: Visual smoke check in the browser**

Start `pnpm dev` (web + server). Open each route and visually confirm:

- `/clients`, `/proposals`, `/policies`, `/commissions`, `/claims`, `/assistances`, `/insurers`, `/audit`, `/endorsements`, `/chat`
- Each has: breadcrumb (except chat), correct `<title>` (browser tab), correct h1, correct description, correct CTA placement (where applicable)
- Click each CTA once — navigation or dialog opens as expected

- [ ] **Step 3: Push branch**

```bash
git push -u origin feat/dashboard-list-page-header
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "refactor(web): unify dashboard list pages with ListPageHeader" --body "$(cat <<'EOF'
## Summary
- Extract shared `ListPageHeader` component (breadcrumb + title + description + action slot)
- Refactor all dashboard list pages (clients, proposals, policies, commissions, claims, assistances, insurers, audit) to use it
- Convert `endorsements/page.tsx` and `chat/page.tsx` to RSC with proper `metadata` (fixes generic "Bens Seguros" title)
- Move primary CTAs out of `TableToolbar` into the page header (padrão X)
- Add `<Plus />` icon and Title Case labels to all CTAs ("Nova Proposta", "Nova Seguradora")

## Spec
`docs/superpowers/specs/2026-04-11-dashboard-consistency-and-sort-fix-design.md`

## Test plan
- [ ] `pnpm lint && pnpm typecheck && pnpm build && pnpm test` all green
- [ ] Manual: each list page renders with breadcrumb + correct title + correct CTA
- [ ] Manual: each CTA still triggers navigation / dialog as before
- [ ] Playwright QA: desktop + mobile screenshots of all 10 modules

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task A.13: Code review (subagent)

- [ ] **Step 1: Dispatch the code-reviewer subagent**

Launch `superpowers:code-reviewer` agent with this prompt (copy-paste as-is):

> Review the staged/committed changes on branch `feat/dashboard-list-page-header` against the spec at `docs/superpowers/specs/2026-04-11-dashboard-consistency-and-sort-fix-design.md` and against `CLAUDE.md`. Focus areas: (1) all 10 pages use `ListPageHeader` correctly with the right breadcrumb and title, (2) CTAs moved out of toolbars (no "Nova"/"Novo" button inside `TableToolbar` in proposals/claims/assistances/insurers tables), (3) casing is "Nova Proposta"/"Nova Seguradora" (Title Case), (4) `endorsements/page.tsx` and `chat/page.tsx` are RSC (no 'use client'), (5) new `*CreateButton` components are client components with isolated dialog state, (6) no files above 200 lines as a regression, (7) zero new `any`, `console.log`, `eslint-disable`. Report blockers with file:line.

- [ ] **Step 2: Address review findings**

For each blocker, fix inline and add a new commit `fix(web): <description>`. Re-run `pnpm lint typecheck build test` after each fix.

---

## Task A.14: QA Playwright + merge

- [ ] **Step 1: Run Playwright QA end-to-end**

Using the Playwright MCP:

1. Resize to 1440×900 desktop.
2. Navigate to `http://localhost:3000/clients` and each of the 10 modules.
3. For each, verify via `browser_evaluate`:
   - `document.title` starts with the module name
   - `document.querySelector('[aria-label="breadcrumb"]')` exists (except chat)
   - `document.querySelector('h1')?.textContent` matches the expected title
   - If the module has a CTA: a primary button exists inside `main > div > div.flex.items-start.justify-between` (header) — not inside `[data-slot="table-toolbar"]`
4. Take screenshots to `audit/qa-report/after-fixes/desktop/<module>.png`
5. Resize to 375×812, re-screenshot to `audit/qa-report/after-fixes/mobile/<module>.png`

- [ ] **Step 2: Fix regressions if any; commit + push**

- [ ] **Step 3: Merge once CI is green**

```bash
gh pr merge --squash --delete-branch
```

- [ ] **Step 4: Return to main and pull**

```bash
git checkout main && git pull
```

---

# PART B — Server-Side Sort PR (`feat/sort-proposals-insurers`)

## Task B.1: Create branch + extend proposal domain types

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/proposal-repository.ts`

- [ ] **Step 1: Create branch**

```bash
git checkout -b feat/sort-proposals-insurers
```

- [ ] **Step 2: Add sort fields to the domain types**

Replace the content of `proposal-repository.ts`:

```ts
import type { Proposal, Stage, BoardType } from './proposal.js'

export type ProposalSortField =
  | 'clientName'
  | 'branch'
  | 'stage'
  | 'type'
  | 'premiumValueInCents'
  | 'createdAt'

export type SortOrder = 'asc' | 'desc'

export interface ProposalFilters {
  organizationId: string
  stage?: Stage
  clientId?: string
  salespersonId?: string
  boardType?: BoardType
  insurerId?: string
  sourcePolicyId?: string
  createdFrom?: Date
  createdTo?: Date
  search?: string
}

export interface ProposalCursorPage {
  cursor?: string
  limit: number
  sortBy?: ProposalSortField
  sortOrder?: SortOrder
}

export interface ProposalPage {
  items: Proposal[]
  total?: number
  nextCursor: string | null
}

export interface ProposalRepository {
  save(proposal: Proposal): Promise<void>
  findById(id: string, organizationId: string): Promise<Proposal | null>
  findMany(
    filters: ProposalFilters,
    page: ProposalCursorPage
  ): Promise<ProposalPage>
}
```

- [ ] **Step 3: Typecheck core**

Run: `pnpm --filter @repo/core typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/proposal/domain/proposal-repository.ts
git commit -m "feat(core): add sort fields to ProposalCursorPage"
```

---

## Task B.2: Translate `sortBy` in `PrismaProposalRepository.findMany`

**Files:**

- Modify: `packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts`

- [ ] **Step 1: Read the current findMany**

Run: `grep -n "findMany\b" packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts`

Note the current `orderBy` (likely `{ createdAt: 'desc' }` hardcoded).

- [ ] **Step 2: Add an orderBy builder and use it**

Near the top of the `findMany` method (after destructuring `page`), add:

```ts
const sortBy = page.sortBy ?? 'createdAt'
const sortOrder = page.sortOrder ?? 'desc'

const orderBy: Prisma.ProposalOrderByWithRelationInput = (() => {
  switch (sortBy) {
    case 'clientName':
      return { client: { name: sortOrder } }
    case 'branch':
      return { branch: sortOrder }
    case 'stage':
      return { stage: sortOrder }
    case 'type':
      return { type: sortOrder }
    case 'premiumValueInCents':
      return { premiumValueInCents: sortOrder }
    case 'createdAt':
    default:
      return { createdAt: sortOrder }
  }
})()
```

Then replace the existing `orderBy:` in the Prisma call with `orderBy`.

If the existing code does a secondary `orderBy` for cursor stability (`[{ createdAt: 'desc' }, { id: 'desc' }]`), wrap the result:

```ts
const finalOrderBy = [orderBy, { id: sortOrder }] as const
```

and pass `finalOrderBy` to Prisma. This preserves cursor stability across duplicate sort keys.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @repo/core typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts
git commit -m "feat(core): translate ProposalSortField to Prisma orderBy"
```

---

## Task B.3: Extend `ListProposals` use case + tests

**Files:**

- Modify: `packages/core/src/modules/proposal/application/list-proposals.ts`
- Modify: `packages/core/src/modules/proposal/application/list-proposals.spec.ts` (create if missing)

- [ ] **Step 1: Check if a spec file exists**

Run: `ls packages/core/src/modules/proposal/application/list-proposals.spec.ts`

- [ ] **Step 2: Write the failing test (TDD)**

Add/create `list-proposals.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ListProposals } from './list-proposals.js'
import type {
  ProposalCursorPage,
  ProposalFilters,
  ProposalRepository,
} from '../domain/proposal-repository.js'

function makeRepo(): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  }
}

describe('ListProposals', () => {
  let repo: ProposalRepository
  let useCase: ListProposals

  beforeEach(() => {
    repo = makeRepo()
    useCase = new ListProposals(repo)
  })

  it('passes sortBy and sortOrder through to the repository', async () => {
    const filters: ProposalFilters = { organizationId: 'org-1' }
    const page: ProposalCursorPage = {
      limit: 10,
      sortBy: 'clientName',
      sortOrder: 'asc',
    }

    await useCase.execute(filters, page)

    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'clientName', sortOrder: 'asc' })
    )
  })

  it('forwards default page when sortBy omitted', async () => {
    const filters: ProposalFilters = { organizationId: 'org-1' }
    const page: ProposalCursorPage = { limit: 10 }

    await useCase.execute(filters, page)

    expect(repo.findMany).toHaveBeenCalledWith(filters, page)
  })
})
```

- [ ] **Step 3: Run the test — should pass already** (the use case is a thin pass-through)

Run: `pnpm --filter @repo/core exec vitest run src/modules/proposal/application/list-proposals.spec.ts`
Expected: PASS.

The `list-proposals.ts` use case itself does not need code changes — it already forwards `page` to `findMany`. The test locks in the contract.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/proposal/application/list-proposals.spec.ts
git commit -m "test(core): lock in ListProposals sort passthrough"
```

---

## Task B.4: Add `sortBy`/`sortOrder` to `proposals` route schema

**Files:**

- Modify: `apps/server/src/routes/v1/proposals/_schemas.ts`
- Modify: `apps/server/src/routes/v1/proposals/list-proposals.ts`

- [ ] **Step 1: Locate `listProposalsQuerySchema` in `_schemas.ts`**

Run: `grep -n "listProposalsQuerySchema\|paginationQuery" apps/server/src/routes/v1/proposals/_schemas.ts`

- [ ] **Step 2: Add the sort schema block near the bottom of the file (before the response schemas)**

```ts
export const proposalSortByEnum = z.enum([
  'clientName',
  'branch',
  'stage',
  'type',
  'premiumValueInCents',
  'createdAt',
])
```

- [ ] **Step 3: Extend `listProposalsQuerySchema`**

Find the current definition (probably `paginationQuery().extend({...})`). Add to the `.extend` object:

```ts
sortBy: proposalSortByEnum.optional().default('createdAt'),
sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
```

- [ ] **Step 4: Pipe through in `list-proposals.ts` route**

Open `apps/server/src/routes/v1/proposals/list-proposals.ts`. In the handler, destructure `sortBy` and `sortOrder` from `request.query` and pass them into the `page` object given to `listProposals.execute(...)`. Mirror the structure of `apps/server/src/routes/v1/clients/list-clients.ts:21-24`.

Typical shape:

```ts
const { limit, cursor, sortBy, sortOrder, ...filters } = request.query
const result = await listProposals.execute(
  { organizationId, ...filters },
  { limit, cursor, sortBy, sortOrder }
)
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @app/server typecheck`
Expected: clean.

- [ ] **Step 6: Integration smoke**

Start `pnpm dev` and hit:

```bash
curl -s "http://localhost:3001/api/v1/proposals?limit=3&sortBy=clientName&sortOrder=asc" | head
```

Should return 200 with `data` ordered by client name ascending (may require auth — run from browser devtools if easier).

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/routes/v1/proposals/
git commit -m "feat(server): accept sortBy/sortOrder on GET /v1/proposals"
```

---

## Task B.5: Extend insurer domain types

**Files:**

- Modify: `packages/core/src/modules/insurer/domain/insurer-repository.ts`

- [ ] **Step 1: Update the interface**

Replace the file content with:

```ts
import type { CursorPage, Page } from '../../client/domain/client-repository.js'

export type InsurerSortField = 'name' | 'code' | 'isActive' | 'updatedAt'

export interface InsurerData {
  id: string
  organizationId: string
  name: string
  code: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface InsurerFilters {
  organizationId: string
  active?: boolean
  search?: string
}

export interface CreateInsurerInput {
  organizationId: string
  name: string
  code?: string
  active?: boolean
}

export interface UpdateInsurerInput {
  id: string
  organizationId: string
  name: string
  code?: string
  active?: boolean
}

export interface InsurerRepository {
  create(data: CreateInsurerInput): Promise<InsurerData>
  findById(id: string, organizationId: string): Promise<InsurerData | null>
  findByName(name: string, organizationId: string): Promise<InsurerData | null>
  findMany(
    filters: InsurerFilters,
    page: CursorPage<InsurerSortField>
  ): Promise<Page<InsurerData>>
  update(data: UpdateInsurerInput): Promise<InsurerData>
}
```

`CursorPage<InsurerSortField>` already has `sortBy?: InsurerSortField; sortOrder?: SortOrder` — verified in `apps/web/... client-repository.ts`.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @repo/core typecheck`
Expected: errors in `prisma-insurer-repository.ts` and `list-insurers.ts` (expected; fix in next tasks).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/insurer/domain/insurer-repository.ts
git commit -m "feat(core): add InsurerSortField to repository interface"
```

---

## Task B.6: Translate `sortBy` in `PrismaInsurerRepository.findMany`

**Files:**

- Modify: `packages/core/src/modules/insurer/infrastructure/prisma-insurer-repository.ts`

- [ ] **Step 1: Read the current findMany**

Run: `grep -n "findMany\b" packages/core/src/modules/insurer/infrastructure/prisma-insurer-repository.ts`

- [ ] **Step 2: Add the orderBy builder**

Inside `findMany`, after destructuring `page`:

```ts
const sortBy = page.sortBy ?? 'name'
const sortOrder = page.sortOrder ?? 'asc'

const orderBy: Prisma.InsurerOrderByWithRelationInput = (() => {
  switch (sortBy) {
    case 'code':
      return { code: sortOrder }
    case 'isActive':
      return { active: sortOrder }
    case 'updatedAt':
      return { updatedAt: sortOrder }
    case 'name':
    default:
      return { name: sortOrder }
  }
})()
```

Note: `sortBy: 'isActive'` maps to the Prisma column `active` (the domain type uses `isActive` for consistency with REST conventions — domain field is already `active`).

- [ ] **Step 3: Replace the hardcoded `orderBy` with `orderBy`**

Keep a stable tiebreaker (`[orderBy, { id: sortOrder }]`) if cursor pagination needs it.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @repo/core typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/insurer/infrastructure/prisma-insurer-repository.ts
git commit -m "feat(core): translate InsurerSortField to Prisma orderBy"
```

---

## Task B.7: Update `ListInsurers` use case + tests

**Files:**

- Modify: `packages/core/src/modules/insurer/application/list-insurers.ts`
- Create/Modify: `packages/core/src/modules/insurer/application/list-insurers.spec.ts`

- [ ] **Step 1: Update use case type**

```ts
import { injectable, inject } from 'tsyringe'
import type { CursorPage, Page } from '../../client/domain/client-repository.js'
import type {
  InsurerRepository,
  InsurerData,
  InsurerFilters,
  InsurerSortField,
} from '../domain/insurer-repository.js'

@injectable()
export class ListInsurers {
  constructor(
    @inject('InsurerRepository') private readonly insurerRepo: InsurerRepository
  ) {}

  async execute(
    filters: InsurerFilters,
    page: CursorPage<InsurerSortField>
  ): Promise<Page<InsurerData>> {
    return this.insurerRepo.findMany(filters, page)
  }
}
```

- [ ] **Step 2: Add test**

```ts
// list-insurers.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ListInsurers } from './list-insurers.js'
import type {
  InsurerFilters,
  InsurerRepository,
} from '../domain/insurer-repository.js'
import type { CursorPage } from '../../client/domain/client-repository.js'

describe('ListInsurers', () => {
  let repo: InsurerRepository
  let useCase: ListInsurers

  beforeEach(() => {
    repo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      findMany: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      update: vi.fn(),
    }
    useCase = new ListInsurers(repo)
  })

  it('passes sortBy=name asc through to the repository', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<'name' | 'code' | 'isActive' | 'updatedAt'> = {
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
    }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'name', sortOrder: 'asc' })
    )
  })
})
```

- [ ] **Step 3: Run test**

Run: `pnpm --filter @repo/core exec vitest run src/modules/insurer/application/list-insurers.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/insurer/application/list-insurers.ts packages/core/src/modules/insurer/application/list-insurers.spec.ts
git commit -m "feat(core): accept sort params in ListInsurers use case"
```

---

## Task B.8: Add `sortBy`/`sortOrder` to `insurers` route schema

**Files:**

- Modify: `apps/server/src/routes/v1/insurers/_schemas.ts`
- Modify: `apps/server/src/routes/v1/insurers/list-insurers.ts`

- [ ] **Step 1: Locate the current `listInsurersQuerySchema`**

Run: `grep -n "listInsurersQuerySchema\|paginationQuery" apps/server/src/routes/v1/insurers/_schemas.ts`

- [ ] **Step 2: Add the sort enum + extend the query schema**

```ts
export const insurerSortByEnum = z.enum([
  'name',
  'code',
  'isActive',
  'updatedAt',
])
```

Extend `listInsurersQuerySchema` with:

```ts
sortBy: insurerSortByEnum.optional().default('name'),
sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
```

- [ ] **Step 3: Pipe through in `list-insurers.ts`**

In the handler destructure `sortBy`, `sortOrder` and include them in the `page` object passed to `listInsurers.execute({...}, { limit, cursor, sortBy, sortOrder })`.

- [ ] **Step 4: Typecheck + smoke**

Run: `pnpm --filter @app/server typecheck`
Smoke:

```bash
curl -s "http://localhost:3001/api/v1/insurers?limit=3&sortBy=name&sortOrder=asc" | head
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/insurers/
git commit -m "feat(server): accept sortBy/sortOrder on GET /v1/insurers"
```

---

## Task B.9: Regenerate Orval

- [ ] **Step 1: Ensure server is running**

`pnpm --filter @app/server dev` (keep running).

- [ ] **Step 2: Regenerate**

```bash
pnpm --filter @app/web generate:api
```

Expected: `apps/web/src/api/model/*`, `apps/web/src/api/endpoints/proposals/*`, and `.../insurers/*` are updated. New types `ListProposalsSortBy`, `ListProposalsSortOrder`, `ListInsurersSortBy`, `ListInsurersSortOrder` appear (actual names depend on Orval's naming — verify with `grep -rn "SortBy" apps/web/src/api/model/ | head`).

- [ ] **Step 3: Typecheck the web app**

```bash
pnpm --filter @app/web typecheck
```

Expected: errors in `proposals-table.tsx`, `use-proposals.ts`, `insurers-table.tsx`, `use-insurers.ts` (expected — fixed next).

- [ ] **Step 4: Commit the regenerated files**

```bash
git add apps/web/src/api/
git commit -m "chore(web): regenerate Orval types for proposals/insurers sort"
```

---

## Task B.10: Update `useProposals` hook

**Files:**

- Modify: `apps/web/src/features/proposals/hooks/use-proposals.ts`

- [ ] **Step 1: Read the current hook**

Run: `cat apps/web/src/features/proposals/hooks/use-proposals.ts`

- [ ] **Step 2: Add `sortBy` and `sortOrder` to the params interface and pass them into the Orval-generated hook**

The exact Orval param names come from the regenerated types. Mirror the pattern from `use-clients.ts`:

```ts
// features/proposals/hooks/use-proposals.ts (new params field)
interface UseProposalsParams {
  search?: string
  boardType?: BoardType
  stage?: ProposalStage
  limit?: number
  cursor?: string
  sortBy?: ListProposalsSortBy // import from '@/api/model'
  sortOrder?: ListProposalsSortOrder
}

export function useProposals(params: UseProposalsParams) {
  return useListProposals({
    ...params,
    // any transformations already in place
  })
}
```

Use the exact Orval type names produced in Task B.9. If the wrapper does any mapping (e.g. undefined-stripping), keep it.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @app/web typecheck`
Expected: `use-proposals.ts` clean; `proposals-table.tsx` still failing.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/proposals/hooks/use-proposals.ts
git commit -m "feat(web): add sortBy/sortOrder to useProposals hook"
```

---

## Task B.11: Convert `proposals-table.tsx` to manual sorting

**Files:**

- Modify: `apps/web/src/features/proposals/components/proposals-table.tsx`
- Modify (if needed): `apps/web/src/features/proposals/lib/type-guards.ts` (new `isProposalSortBy`)
- Modify (if needed): `apps/web/src/features/proposals/lib/constants.ts` (DEFAULT_SORTING)

- [ ] **Step 1: Remove `getSortedRowModel` import and usage**

In `proposals-table.tsx`:

```ts
// before
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

// after
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
```

In the `useReactTable({...})` config, remove `getSortedRowModel: getSortedRowModel()` and add:

```ts
manualSorting: true,
manualPagination: true,
manualFiltering: true,
```

- [ ] **Step 2: Map `SortingState` → `{ sortBy, sortOrder }`**

Near where `sorting` state is declared, mirror the pattern from `clients-table.tsx:52-57`:

```ts
import type { ListProposalsSortBy, ListProposalsSortOrder } from '@/api/model'
import { isProposalSortBy } from '../lib/type-guards'

// ...inside component:
const sortId = sorting[0]?.id
const sortBy: ListProposalsSortBy | undefined =
  sortId && isProposalSortBy(sortId) ? sortId : undefined
const sortOrder: ListProposalsSortOrder | undefined = sorting[0]?.desc
  ? 'desc'
  : 'asc'
```

- [ ] **Step 3: Create `isProposalSortBy` type guard**

In `apps/web/src/features/proposals/lib/type-guards.ts` (create if missing):

```ts
import type { ListProposalsSortBy } from '@/api/model'

const PROPOSAL_SORT_BY_VALUES: readonly ListProposalsSortBy[] = [
  'clientName',
  'branch',
  'stage',
  'type',
  'premiumValueInCents',
  'createdAt',
]

export function isProposalSortBy(value: string): value is ListProposalsSortBy {
  return (PROPOSAL_SORT_BY_VALUES as readonly string[]).includes(value)
}
```

If Orval generated a slightly different enum, adjust the tuple to match.

- [ ] **Step 4: Pass `sortBy`/`sortOrder` into `useProposals`**

```ts
const { data, isLoading, isError, refetch } = useProposals({
  // existing params
  sortBy,
  sortOrder,
})
```

- [ ] **Step 5: Reset cursor when sort changes**

Find where `pagination.reset()` is called for search/filter changes (mirror `clients-table.tsx`). Add `sortBy` and `sortOrder` to the reset triggers:

```ts
useEffect(() => {
  pagination.reset()
}, [debouncedSearch, boardTypeFilter, stageFilter, sortBy, sortOrder])
```

Match whatever deps are already there.

- [ ] **Step 6: Typecheck + lint**

Run: `pnpm --filter @app/web typecheck && pnpm --filter @app/web lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/proposals/
git commit -m "fix(web): proposals-table uses manualSorting with server-side sort"
```

---

## Task B.12: Update `useInsurers` hook

**Files:**

- Modify: `apps/web/src/features/insurers/hooks/use-insurers.ts`

- [ ] **Step 1: Mirror Task B.10 for insurers**

Add `sortBy: ListInsurersSortBy | undefined` and `sortOrder: ListInsurersSortOrder | undefined` to the params and pass them to the Orval hook.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @app/web typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/insurers/hooks/use-insurers.ts
git commit -m "feat(web): add sortBy/sortOrder to useInsurers hook"
```

---

## Task B.13: Convert `insurers-table.tsx` to manual sorting

**Files:**

- Modify: `apps/web/src/features/insurers/components/insurers-table.tsx`
- Create/Modify: `apps/web/src/features/insurers/lib/type-guards.ts`

- [ ] **Step 1: Mirror Task B.11 for insurers**

- Remove `getSortedRowModel` import and its usage
- Add `manualSorting: true`, `manualPagination: true`, `manualFiltering: true`
- Create `isInsurerSortBy` type guard
- Map `sorting[0]` → `{ sortBy, sortOrder }`
- Pass through to `useInsurers({ ..., sortBy, sortOrder })`
- Reset cursor on sort change

Type guard:

```ts
// apps/web/src/features/insurers/lib/type-guards.ts
import type { ListInsurersSortBy } from '@/api/model'

const INSURER_SORT_BY_VALUES: readonly ListInsurersSortBy[] = [
  'name',
  'code',
  'isActive',
  'updatedAt',
]

export function isInsurerSortBy(value: string): value is ListInsurersSortBy {
  return (INSURER_SORT_BY_VALUES as readonly string[]).includes(value)
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @app/web typecheck && pnpm --filter @app/web lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/insurers/
git commit -m "fix(web): insurers-table uses manualSorting with server-side sort"
```

---

## Task B.14: Quality gates + open PR

- [ ] **Step 1: Full quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Expected: all green.

- [ ] **Step 2: Manual smoke in the browser**

- `/proposals` — click "Cliente" header, observe network request has `sortBy=clientName`, list re-orders
- Click "Cliente" again — `sortOrder=desc`
- Change sort, then click next page — cursor resets to page 1
- `/insurers` — same drill with "Nome"

- [ ] **Step 3: Push branch**

```bash
git push -u origin feat/sort-proposals-insurers
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "fix(web,server): server-side sort for proposals and insurers" --body "$(cat <<'EOF'
## Summary
- Add `sortBy`/`sortOrder` query params to `GET /v1/proposals` and `GET /v1/insurers`
- Implement Prisma `orderBy` translation in both repositories
- Regenerate Orval types
- Convert `proposals-table.tsx` and `insurers-table.tsx` to `manualSorting: true + manualPagination: true + manualFiltering: true`
- Remove broken client-side `getSortedRowModel` that only sorted the current page
- Reset cursor when sort changes

## Spec
`docs/superpowers/specs/2026-04-11-dashboard-consistency-and-sort-fix-design.md`

## Test plan
- [ ] `pnpm lint && pnpm typecheck && pnpm build && pnpm test` all green
- [ ] Backend unit tests for ListProposals / ListInsurers sort passthrough
- [ ] Manual: click column headers on /proposals and /insurers, verify request param + re-order
- [ ] Manual: sort + change page → cursor resets
- [ ] Playwright QA: validate server-side sort end-to-end

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task B.15: Code review (subagent)

- [ ] **Step 1: Dispatch code-reviewer**

> Review `feat/sort-proposals-insurers` against the spec at `docs/superpowers/specs/2026-04-11-dashboard-consistency-and-sort-fix-design.md` and `CLAUDE.md`. Focus: (1) backend schema + route + use case + repository aligned for both proposals and insurers, (2) Prisma `orderBy` handles all declared sort keys including the `clientName` join, (3) cursor stability preserved via secondary id ordering, (4) `proposals-table.tsx` and `insurers-table.tsx` use `manualSorting/manualPagination/manualFiltering`, (5) `getSortedRowModel` removed, (6) cursor resets on sort change, (7) zero `any`, no regressions in tests. Report blockers with file:line.

- [ ] **Step 2: Address findings, recommit**

---

## Task B.16: QA Playwright + merge

- [ ] **Step 1: Playwright end-to-end**

Using the Playwright MCP:

1. Navigate to `/proposals`, click the "Cliente" header
2. Check `browser_network_requests` for `/api/v1/proposals?...sortBy=clientName...`
3. Confirm the table re-renders ordered by client name
4. Change sort, then click "Próximo" — cursor should reset (verify `cursor=` is absent in the first click)
5. Repeat for `/insurers`, column "Nome"
6. Take screenshots into `audit/qa-report/after-fixes/sort/`

- [ ] **Step 2: Fix regressions if any**

- [ ] **Step 3: Merge**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

# Self-review appendix (for the plan author)

The following checks were performed while writing this plan:

- **Spec coverage**: every P0 and P1 item in `REPORT.md` maps to a task. QA-P0-1 → B.4, B.8, B.11, B.13; QA-P0-2 → A.10; QA-P0-3 → A.11; QA-P1-1 → A.5; QA-P1-3/P1-4 → A.6, A.7, A.8, A.9; QA-P1-6 → A.2, A.6; Audit breadcrumb → A.5.
- **Placeholders**: no "TBD", no "similar to Task N" without code, no "add error handling" without specifics.
- **Type consistency**: `ProposalSortField` declared in B.1 is used verbatim in B.2, B.3. `InsurerSortField` declared in B.5 used verbatim in B.6, B.7. `ListProposalsSortBy`/`ListInsurersSortBy` names are placeholders pending Orval output in B.9 — B.10/B.11/B.12/B.13 instruct the implementer to `grep` for actual names.
- **Unknown assumption**: Task A.8 / A.9 show two variants (navigation vs dialog) because the current claim/assistance creation flow was not fully inspected during planning. Implementer must check and pick the matching variant (this is an intentional branch, not a placeholder).
