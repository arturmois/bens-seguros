# Clients Table Zenith Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the clients listing page to the Zenith Dashboard visual pattern with @tanstack/react-table, tab group filters, Zenith-style pagination, mobile cards, and dedicated form pages.

**Architecture:** @tanstack/react-table as a controlled renderer with `manualSorting`, `manualPagination`, `manualFiltering`. Backend adds `sortBy`/`sortOrder` query params. Forms move from Sheet to dedicated routes (`/clients/new`, `/clients/[id]/edit`). Reusable `PageBreadcrumb` component created for all dashboard pages.

**Tech Stack:** Next.js 16 App Router, React 19, @tanstack/react-table, Recharts (sparklines), Shadcn UI (@coss/style), Tailwind CSS 4, Orval-generated React Query hooks.

**Spec:** `docs/superpowers/specs/2026-04-08-clients-table-zenith-redesign.md`

---

## Task 1: Install @tanstack/react-table

**Files:**

- Modify: `apps/web/package.json`

- [ ] **Step 1: Install the dependency**

```bash
pnpm --filter @app/web add @tanstack/react-table
```

- [ ] **Step 2: Verify installation**

```bash
pnpm --filter @app/web exec node -e "require('@tanstack/react-table')" && echo 'OK'
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add @tanstack/react-table to web app"
```

---

## Task 2: Backend — Add sortBy/sortOrder to list-clients endpoint

**Files:**

- Modify: `apps/server/src/routes/v1/clients/_schemas.ts`
- Modify: `apps/server/src/routes/v1/clients/list-clients.ts`
- Modify: `packages/core/src/modules/client/domain/client-repository.ts`
- Modify: `packages/core/src/modules/client/infrastructure/prisma-client-repository.ts`
- Modify: `packages/core/src/modules/client/application/list-clients.ts`

- [ ] **Step 1: Add sort fields to the domain repository interface**

In `packages/core/src/modules/client/domain/client-repository.ts`, add a `SortField` type and extend `ClientFilters`:

```typescript
// Add after the ClientAddress interface:
export type ClientSortField = 'name' | 'document' | 'type' | 'createdAt'

export type SortOrder = 'asc' | 'desc'
```

Extend `CursorPage`:

```typescript
export interface CursorPage {
  cursor?: string
  limit: number
  sortBy?: ClientSortField
  sortOrder?: SortOrder
}
```

- [ ] **Step 2: Update the Prisma repository to use sort params**

In `packages/core/src/modules/client/infrastructure/prisma-client-repository.ts`, update the `findMany` method. Replace the existing `orderBy` line:

```typescript
// Replace this:
orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],

// With this:
orderBy: [
  { [page.sortBy ?? 'createdAt']: page.sortOrder ?? 'desc' },
  { id: 'desc' },
],
```

- [ ] **Step 3: Add sortBy/sortOrder to the route schema**

In `apps/server/src/routes/v1/clients/_schemas.ts`, update `listClientsQuerySchema`:

```typescript
export const listClientsQuerySchema = paginationQuery().extend({
  type: z.enum(CLIENT_TYPE_VALUES).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['name', 'document', 'type', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})
```

- [ ] **Step 4: Pass sort params in the route handler**

In `apps/server/src/routes/v1/clients/list-clients.ts`, update the handler to pass sort params:

```typescript
handler: async (request, reply) => {
  const useCase = container.resolve(ListClients)
  const { limit, cursor, sortBy, sortOrder, ...filters } = request.query
  const result = await useCase.execute(
    { organizationId: request.organizationId!, ...filters },
    { limit, cursor, sortBy, sortOrder }
  )
  return reply.send({
    success: true,
    data: result.items.map((c) => ClientPresenter.toList(c)),
    meta: { total: result.total, nextCursor: result.nextCursor },
  })
},
```

- [ ] **Step 5: Run typecheck to verify**

```bash
pnpm typecheck
```

Expected: No errors in packages/core or apps/server.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/client/ apps/server/src/routes/v1/clients/
git commit -m "feat(server): add sortBy/sortOrder params to list-clients endpoint"
```

---

## Task 3: Regenerate Orval API client

**Files:**

- Regenerated: `apps/web/src/api/endpoints/clients/`
- Regenerated: `apps/web/src/api/model/`

- [ ] **Step 1: Start the server (if not running)**

```bash
pnpm --filter @app/server dev &
```

Wait for "Server listening on port 3001".

- [ ] **Step 2: Regenerate the API client**

```bash
pnpm --filter @app/web generate:api
```

This regenerates React Query hooks, types, and Zod schemas from the OpenAPI spec. The new `sortBy` and `sortOrder` params will appear in `ListClientsParams`.

- [ ] **Step 3: Verify the new params exist in the generated types**

Check that `apps/web/src/api/model/listClientsParams.ts` now includes `sortBy` and `sortOrder`.

```bash
grep -n 'sortBy\|sortOrder' apps/web/src/api/model/listClientsParams.ts
```

Expected: Both params present.

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/
git commit -m "chore(web): regenerate Orval client with sortBy/sortOrder params"
```

---

## Task 4: Create reusable PageBreadcrumb component

**Files:**

- Create: `apps/web/src/components/page-breadcrumb.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/page-breadcrumb.tsx`:

```tsx
import { Fragment } from 'react'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface BreadcrumbEntry {
  readonly label: string
  readonly href?: string
}

interface PageBreadcrumbProps {
  readonly items: readonly BreadcrumbEntry[]
}

export function PageBreadcrumb({ items }: PageBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink render={<Link href={item.href} />}>
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

Note: The Shadcn Breadcrumb in this codebase uses `@base-ui/react`'s `useRender` pattern. The `render` prop accepts a React element to use as the base tag. We pass `<Link href={...} />` so Next.js client-side navigation works.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/page-breadcrumb.tsx
git commit -m "feat(web): add reusable PageBreadcrumb component"
```

---

## Task 5: Update constants and add new types for Zenith pattern

**Files:**

- Modify: `apps/web/src/features/clients/lib/constants.ts`

- [ ] **Step 1: Update constants**

In `apps/web/src/features/clients/lib/constants.ts`, add the following after the existing exports:

```typescript
// Add this import at the top (alongside existing imports):
import type { SortingState, VisibilityState } from '@tanstack/react-table'

// Update TYPE_BADGE_VARIANT to match Zenith pattern (replace existing):
export const TYPE_BADGE_VARIANT: Record<
  ClientType,
  'default' | 'warning' | 'destructive'
> = {
  LEAD: 'warning',
  CLIENT: 'default',
  FORMER_CLIENT: 'destructive',
}

// Add after TYPE_BADGE_VARIANT:
export const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...TYPE_OPTIONS,
] as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  document: true,
  type: true,
  createdAt: true,
  trend: false, // hidden by default until backend provides trend data
  phone: true,
}

export const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

export interface ClientsTableFilters extends ClientFilters {
  readonly sortBy?: string
  readonly sortOrder?: 'asc' | 'desc'
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/lib/constants.ts
git commit -m "feat(web): update client constants for Zenith table pattern"
```

---

## Task 6: Update useClients hook with sort params

**Files:**

- Modify: `apps/web/src/features/clients/hooks/use-clients.ts`

- [ ] **Step 1: Update the useClients hook signature**

In `apps/web/src/features/clients/hooks/use-clients.ts`, update the `useClients` function to accept sort params. Replace the existing `useClients` function:

```typescript
export function useClients(
  filters: ClientFilters & { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) {
  return useListClients(filters, {
    query: {
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}
```

The Orval-generated `useListClients` already accepts `ListClientsParams` which now includes `sortBy` and `sortOrder` (from Task 3). Our `ClientFilters` interface properties (`search`, `type`, `cursor`, `limit`) plus the new sort params are all valid `ListClientsParams` keys.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/hooks/use-clients.ts
git commit -m "feat(web): add sort params to useClients hook"
```

---

## Task 7: Create filter tabs component

**Files:**

- Create: `apps/web/src/features/clients/components/clients-filter-tabs.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/features/clients/components/clients-filter-tabs.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { TYPE_FILTER_OPTIONS } from '../lib/constants'

interface ClientsFilterTabsProps {
  readonly activeFilter: string
  readonly onFilterChange: (value: string) => void
}

export function ClientsFilterTabs({
  activeFilter,
  onFilterChange,
}: ClientsFilterTabsProps) {
  return (
    <div className="bg-muted flex w-fit items-center gap-1 rounded-lg p-0.5">
      {TYPE_FILTER_OPTIONS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
            activeFilter === filter.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/components/clients-filter-tabs.tsx
git commit -m "feat(web): add Zenith-style filter tabs for clients"
```

---

## Task 8: Create sparkline component

**Files:**

- Create: `apps/web/src/features/clients/components/client-sparkline.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/features/clients/components/client-sparkline.tsx`:

```tsx
'use client'

import { AreaChart, Area } from 'recharts'

interface ClientSparklineProps {
  readonly data?: readonly { value: number }[]
}

function generateMockTrend(): { value: number }[] {
  const points: { value: number }[] = []
  let current = 50
  for (let i = 0; i < 7; i++) {
    current += Math.floor(Math.random() * 30) - 12
    current = Math.max(10, Math.min(100, current))
    points.push({ value: current })
  }
  return points
}

export function ClientSparkline({ data }: ClientSparklineProps) {
  const points = data ?? generateMockTrend()
  const first = points[0]?.value ?? 0
  const last = points[points.length - 1]?.value ?? 0
  const isPositive = last >= first
  const color = isPositive ? '#22c55e' : '#ef4444'

  return (
    <AreaChart width={60} height={24} data={points}>
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        fill={color}
        fillOpacity={0.1}
        strokeWidth={1.5}
        isAnimationActive={false}
      />
    </AreaChart>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/components/client-sparkline.tsx
git commit -m "feat(web): add sparkline component for client trend column"
```

---

## Task 9: Create TanStack column definitions

**Files:**

- Create: `apps/web/src/features/clients/components/clients-columns.tsx`

- [ ] **Step 1: Create column definitions**

Create `apps/web/src/features/clients/components/clients-columns.tsx`:

```tsx
'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { formatDocument, formatPhone } from '@/lib/masks'
import type { ClientData } from '../lib/constants'
import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants'
import { ClientSparkline } from './client-sparkline'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface ColumnActions {
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function createClientColumns(
  actions: ColumnActions
): ColumnDef<ClientData>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selecionar linha"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Nome
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => {
        const client = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {getInitials(client.name)}
            </div>
            <div>
              <div className="font-medium">{client.name}</div>
              <div className="text-muted-foreground text-xs">
                {client.email ?? '-'}
              </div>
            </div>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: 'document',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Documento
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDocument(row.original.document)}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Tipo
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <Badge variant={TYPE_BADGE_VARIANT[row.original.type]}>
          {TYPE_LABELS[row.original.type]}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Criado em
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'trend',
      header: 'Trend',
      cell: () => <ClientSparkline />,
      enableSorting: false,
    },
    {
      accessorKey: 'phone',
      header: 'Telefone',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.phone ? formatPhone(row.original.phone) : '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const client = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView(client.id)}>
                <Eye className="mr-2 size-4" />
                Ver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(client.id)}>
                <Pencil className="mr-2 size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => actions.onDelete(client.id)}
              >
                <Trash2 className="mr-2 size-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
  ]
}
```

Note: `formatPhone` may or may not exist in `@/lib/masks`. Check the file — if it doesn't exist, use a simple fallback: `client.phone ?? '-'`. The `formatDocument` function is confirmed to exist from the current codebase.

- [ ] **Step 2: Verify formatPhone exists**

```bash
grep -n 'export.*formatPhone' apps/web/src/lib/masks.ts
```

If not found, add a simple formatter or just display the raw phone string.

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/clients/components/clients-columns.tsx
git commit -m "feat(web): add TanStack column definitions for clients table"
```

---

## Task 10: Create DataTable component for clients

**Files:**

- Create: `apps/web/src/features/clients/components/clients-data-table.tsx`

- [ ] **Step 1: Create the DataTable component**

Create `apps/web/src/features/clients/components/clients-data-table.tsx`:

```tsx
'use client'

import { flexRender, type Table as TanStackTable } from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

import type { ClientData } from '../lib/constants'

interface ClientsDataTableProps {
  readonly table: TanStackTable<ClientData>
  readonly isLoading: boolean
  readonly onRowClick: (id: string) => void
}

export function ClientsDataTable({
  table,
  isLoading,
  onRowClick,
}: ClientsDataTableProps) {
  return (
    <div className="hidden rounded-md border md:block">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingRows colCount={table.getAllColumns().length} />
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-32 text-center"
              >
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  <p>Nenhum cliente encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                data-state={row.getIsSelected() && 'selected'}
                onClick={() => onRowClick(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function LoadingRows({ colCount }: { readonly colCount: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: colCount }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/components/clients-data-table.tsx
git commit -m "feat(web): add clients DataTable with TanStack rendering"
```

---

## Task 11: Create mobile cards component

**Files:**

- Create: `apps/web/src/features/clients/components/client-cards.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/features/clients/components/client-cards.tsx`:

```tsx
'use client'

import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

import { formatDocument } from '@/lib/masks'
import type { ClientData } from '../lib/constants'
import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface ClientCardsProps {
  readonly data: ClientData[] | undefined
  readonly isLoading: boolean
  readonly onView: (id: string) => void
  readonly onEdit: (id: string) => void
  readonly onDelete: (id: string) => void
}

export function ClientCards({
  data,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: ClientCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="flex h-32 items-center justify-center md:hidden">
        <p className="text-muted-foreground text-sm">
          Nenhum cliente encontrado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:hidden">
      {data.map((client) => (
        <div
          key={client.id}
          className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
          onClick={() => onView(client.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onView(client.id)
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {getInitials(client.name)}
              </div>
              <span className="font-medium">{client.name}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(client.id)}>
                  <Eye className="mr-2 size-4" />
                  Ver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(client.id)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(client.id)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Documento</div>
              <div>{formatDocument(client.document)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Tipo</div>
              <Badge variant={TYPE_BADGE_VARIANT[client.type]}>
                {TYPE_LABELS[client.type]}
              </Badge>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">E-mail</div>
              <div className="truncate">{client.email ?? '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Telefone</div>
              <div>{client.phone ?? '-'}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/components/client-cards.tsx
git commit -m "feat(web): add Zenith-style mobile cards for clients"
```

---

## Task 12: Rewrite toolbar with Columns toggle

**Files:**

- Modify: `apps/web/src/features/clients/components/clients-toolbar.tsx`

- [ ] **Step 1: Rewrite the toolbar**

Replace the entire content of `apps/web/src/features/clients/components/clients-toolbar.tsx`:

```tsx
'use client'

import type { Table } from '@tanstack/react-table'
import { Download, SlidersHorizontal, Upload, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

import type { ClientData, ClientFilters } from '../lib/constants'
import { ClientExportButton } from './client-export-button'
import { ClientImportButton } from './import-dialog'

interface ClientsToolbarProps {
  readonly table: Table<ClientData>
  readonly search: string
  readonly onSearchChange: (value: string) => void
  readonly currentFilters: ClientFilters
}

const COLUMN_LABELS: Record<string, string> = {
  document: 'Documento',
  type: 'Tipo',
  createdAt: 'Criado em',
  trend: 'Trend',
  phone: 'Telefone',
}

export function ClientsToolbar({
  table,
  search,
  onSearchChange,
  currentFilters,
}: ClientsToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar clientes..."
          className="h-9 w-full ps-9 md:w-[320px]"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar clientes"
        />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="size-4" />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Alternar colunas</DropdownMenuLabel>
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
                >
                  {COLUMN_LABELS[col.id] ?? col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ClientImportButton />

        <ClientExportButton filters={currentFilters} />
      </div>
    </div>
  )
}
```

Note: The `ClientImportButton` and `ClientExportButton` imports may need adjustment — check the actual export names from `import-dialog.tsx` and `client-export-button.tsx`. The current toolbar imports them as `ClientImportButton` from `./import-dialog` and `ClientExportButton` from `./client-export-button`. Verify and adjust if needed.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

Fix any import issues (the import button component name may vary).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/components/clients-toolbar.tsx
git commit -m "feat(web): rewrite toolbar with Zenith columns toggle"
```

---

## Task 13: Rewrite pagination with Zenith visual

**Files:**

- Modify: `apps/web/src/features/clients/components/clients-pagination.tsx`

- [ ] **Step 1: Rewrite the pagination component**

Replace the entire content of `apps/web/src/features/clients/components/clients-pagination.tsx`:

```tsx
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { PAGE_SIZE_OPTIONS } from '../lib/constants'

interface ClientsPaginationProps {
  readonly total: number
  readonly pageSize: number
  readonly onPageSizeChange: (size: number) => void
  readonly currentPage: number
  readonly hasNextPage: boolean
  readonly hasPreviousPage: boolean
  readonly onNext: () => void
  readonly onPrevious: () => void
}

export function ClientsPagination({
  total,
  pageSize,
  onPageSizeChange,
  currentPage,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
}: ClientsPaginationProps) {
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, total)

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <span className="text-muted-foreground text-sm">
        Mostrando {from}-{to} de {total} resultados
      </span>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Linhas</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!hasPreviousPage}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasNextPage}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/components/clients-pagination.tsx
git commit -m "feat(web): rewrite pagination with Zenith visual style"
```

---

## Task 14: Rewrite ClientsContent (main orchestrator)

**Files:**

- Modify: `apps/web/src/features/clients/components/clients-table.tsx`

This is the core rewrite — replacing the manual table with TanStack, wiring up all new components.

- [ ] **Step 1: Rewrite the entire file**

Replace the entire content of `apps/web/src/features/clients/components/clients-table.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'

import { useDebounce } from '@/hooks/use-debounce'
import type { ClientData } from '../lib/constants'
import { DEFAULT_COLUMN_VISIBILITY, DEFAULT_SORTING } from '../lib/constants'
import { useClients, useDeleteClient } from '../hooks/use-clients'
import { createClientColumns } from './clients-columns'
import { ClientsDataTable } from './clients-data-table'
import { ClientCards } from './client-cards'
import { ClientsFilterTabs } from './clients-filter-tabs'
import { ClientsPagination } from './clients-pagination'
import { ClientsToolbar } from './clients-toolbar'
import { DeleteClientDialog } from './delete-client-dialog'

export function ClientsContent() {
  const router = useRouter()

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // Pagination (cursor-based)
  const [pageSize, setPageSize] = useState(10)
  const [cursors, setCursors] = useState<string[]>([])
  const currentCursor = cursors[cursors.length - 1]
  const currentPage = cursors.length + 1

  // TanStack state
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [rowSelection, setRowSelection] = useState({})

  // Delete state
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const deleteClient = useDeleteClient()

  // Derive sort params from TanStack sorting state
  const sortBy = sorting[0]?.id
  const sortOrder = sorting[0]?.desc ? ('desc' as const) : ('asc' as const)

  // Fetch data
  const { data, isLoading, isError, refetch } = useClients({
    search: debouncedSearch || undefined,
    type: typeFilter || undefined,
    cursor: currentCursor,
    limit: pageSize,
    sortBy,
    sortOrder,
  })

  const clients: ClientData[] = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const nextCursor = data?.meta?.nextCursor ?? null

  // Column actions
  const columnActions = useMemo(
    () => ({
      onView: (id: string) => router.push(`/clients/${id}`),
      onEdit: (id: string) => router.push(`/clients/${id}/edit`),
      onDelete: (id: string) => setDeletingClientId(id),
    }),
    [router]
  )

  const columns = useMemo(
    () => createClientColumns(columnActions),
    [columnActions]
  )

  // TanStack table instance
  const table = useReactTable({
    data: clients,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex: 0, pageSize },
    },
    onSortingChange: (updater) => {
      setSorting(updater)
      setCursors([]) // reset pagination on sort change
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
    rowCount: total,
    enableRowSelection: true,
  })

  // Pagination handlers
  function handleNextPage() {
    if (nextCursor) {
      setCursors((prev) => [...prev, nextCursor])
    }
  }

  function handlePreviousPage() {
    setCursors((prev) => prev.slice(0, -1))
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setCursors([]) // reset to page 1
  }

  // Filter change resets pagination
  function handleTypeFilterChange(value: string) {
    setTypeFilter(value)
    setCursors([])
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setCursors([])
  }

  function handleConfirmDelete() {
    if (!deletingClientId) return
    deleteClient.mutate(deletingClientId, {
      onSuccess: () => setDeletingClientId(null),
    })
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-destructive text-sm">
          Erro ao carregar os clientes.
        </p>
        <button
          type="button"
          className="text-primary text-sm underline"
          onClick={() => refetch()}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ClientsFilterTabs
        activeFilter={typeFilter}
        onFilterChange={handleTypeFilterChange}
      />

      <ClientsToolbar
        table={table}
        search={search}
        onSearchChange={handleSearchChange}
        currentFilters={{
          search: debouncedSearch || undefined,
          type: typeFilter || undefined,
        }}
      />

      <ClientsDataTable
        table={table}
        isLoading={isLoading}
        onRowClick={(id) => router.push(`/clients/${id}`)}
      />

      <ClientCards
        data={clients}
        isLoading={isLoading}
        onView={(id) => router.push(`/clients/${id}`)}
        onEdit={(id) => router.push(`/clients/${id}/edit`)}
        onDelete={(id) => setDeletingClientId(id)}
      />

      <ClientsPagination
        total={total}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        currentPage={currentPage}
        hasNextPage={nextCursor !== null}
        hasPreviousPage={cursors.length > 0}
        onNext={handleNextPage}
        onPrevious={handlePreviousPage}
      />

      <DeleteClientDialog
        open={deletingClientId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingClientId(null)
        }}
        onConfirm={handleConfirmDelete}
        isPending={deleteClient.isPending}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/components/clients-table.tsx
git commit -m "feat(web): rewrite ClientsContent with TanStack table and Zenith pattern"
```

---

## Task 15: Update the clients page with breadcrumb and page header

**Files:**

- Modify: `apps/web/src/app/(dashboard)/clients/page.tsx`

- [ ] **Step 1: Rewrite the page**

Replace the entire content of `apps/web/src/app/(dashboard)/clients/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ClientsContent } from '@/features/clients/components/clients-table'

export const metadata: Metadata = { title: 'Clientes' }

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clientes' },
          ]}
        />

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie sua base de clientes e leads.
            </p>
          </div>
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="size-4" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      </div>

      <ClientsContent />
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/clients/page.tsx
git commit -m "feat(web): add breadcrumb and Zenith page header to clients page"
```

---

## Task 16: Refactor ClientForm — remove Sheet, make standalone

**Files:**

- Modify: `apps/web/src/features/clients/components/client-form.tsx`

- [ ] **Step 1: Refactor the form to be a standalone component**

The current `ClientForm` is wrapped in a `Sheet` dialog. We need to extract the form logic to work both as a standalone form on a page AND still support the Sheet usage from the detail page (until that's migrated too).

Replace the entire content of `apps/web/src/features/clients/components/client-form.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

import { CreateClientBody } from '@/api/endpoints/clients/clients.zod'
import { useCreateClient, useUpdateClient } from '../hooks/use-clients'
import { EMPTY_FORM_VALUES } from '../lib/constants'
import { ClientFormFields } from './client-form-fields'

const ClientFormSchema = CreateClientBody.extend({
  personType: CreateClientBody.shape.personType,
})

type ClientFormValues = z.infer<typeof ClientFormSchema>

interface ClientFormProps {
  readonly defaultValues?: ClientFormValues
  readonly clientId?: string
  readonly onSuccess?: () => void
  readonly onCancel?: () => void
}

export function ClientForm({
  defaultValues,
  clientId,
  onSuccess,
  onCancel,
}: ClientFormProps) {
  const isEditing = Boolean(clientId)
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const isPending = createClient.isPending || updateClient.isPending

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(ClientFormSchema),
    defaultValues: defaultValues ?? EMPTY_FORM_VALUES,
  })

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues)
    }
  }, [defaultValues, form])

  function cleanSocialMedia(
    social: ClientFormValues['socialMedia']
  ): ClientFormValues['socialMedia'] {
    if (!social) return undefined
    const cleaned = Object.fromEntries(
      Object.entries(social).filter(([, v]) => v && v.trim() !== '')
    )
    return Object.keys(cleaned).length > 0
      ? (cleaned as ClientFormValues['socialMedia'])
      : undefined
  }

  function onSubmit(values: ClientFormValues) {
    const payload = {
      ...values,
      socialMedia: cleanSocialMedia(values.socialMedia),
    }

    if (isEditing && clientId) {
      updateClient.mutate({ id: clientId, values: payload }, { onSuccess })
    } else {
      createClient.mutate(payload, { onSuccess })
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ClientFormFields isReadOnly={false} />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  )
}

export type { ClientFormValues }
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

There may be type errors in `client-detail.tsx` because the old `ClientForm` accepted `open`/`onOpenChange` props. We'll fix that in Task 19.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/components/client-form.tsx
git commit -m "refactor(web): extract ClientForm from Sheet into standalone component"
```

---

## Task 17: Create /clients/new page

**Files:**

- Create: `apps/web/src/app/(dashboard)/clients/new/page.tsx`

- [ ] **Step 1: Create the page**

Create `apps/web/src/app/(dashboard)/clients/new/page.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ClientForm } from '@/features/clients/components/client-form'

export default function NewClientPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clientes', href: '/clients' },
            { label: 'Novo Cliente' },
          ]}
        />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Novo Cliente
          </h1>
          <p className="text-muted-foreground text-sm">
            Cadastre um novo cliente ou lead.
          </p>
        </div>
      </div>

      <div className="max-w-2xl rounded-lg border p-6">
        <h2 className="font-semibold">Dados do Cliente</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Preencha as informações abaixo para cadastrar.
        </p>

        <ClientForm
          onSuccess={() => router.push('/clients')}
          onCancel={() => router.push('/clients')}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/clients/new/
git commit -m "feat(web): add dedicated /clients/new page with breadcrumb"
```

---

## Task 18: Create /clients/[id]/edit page

**Files:**

- Create: `apps/web/src/app/(dashboard)/clients/[id]/edit/page.tsx`

- [ ] **Step 1: Create the edit page**

Create `apps/web/src/app/(dashboard)/clients/[id]/edit/page.tsx`:

```tsx
'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ClientForm } from '@/features/clients/components/client-form'
import { useClient } from '@/features/clients/hooks/use-clients'

interface EditClientPageProps {
  params: Promise<{ id: string }>
}

export default function EditClientPage({ params }: EditClientPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: client, isLoading, isError } = useClient(id)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (isError || !client) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-destructive text-sm">
          Erro ao carregar os dados do cliente.
        </p>
        <button
          type="button"
          className="text-primary text-sm underline"
          onClick={() => router.push('/clients')}
        >
          Voltar para clientes
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clientes', href: '/clients' },
            { label: client.name, href: `/clients/${id}` },
            { label: 'Editar' },
          ]}
        />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar Cliente
          </h1>
          <p className="text-muted-foreground text-sm">
            Atualize as informações do cliente.
          </p>
        </div>
      </div>

      <div className="max-w-2xl rounded-lg border p-6">
        <h2 className="font-semibold">Dados do Cliente</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Altere os campos necessários e salve.
        </p>

        <ClientForm
          clientId={id}
          defaultValues={{
            name: client.name,
            document: client.document,
            personType: client.personType ?? 'INDIVIDUAL',
            type: client.type,
            email: client.email ?? '',
            phone: client.phone ?? '',
            birthDate: client.birthDate
              ? (() => {
                  const d = new Date(client.birthDate)
                  const year = d.getUTCFullYear()
                  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
                  const day = String(d.getUTCDate()).padStart(2, '0')
                  return `${year}-${month}-${day}`
                })()
              : '',
            profession: client.profession ?? '',
            maritalStatus: client.maritalStatus ?? undefined,
            socialMedia: client.socialMedia
              ? {
                  instagram: client.socialMedia.instagram ?? '',
                  facebook: client.socialMedia.facebook ?? '',
                  linkedin: client.socialMedia.linkedin ?? '',
                  tiktok: client.socialMedia.tiktok ?? '',
                }
              : undefined,
          }}
          onSuccess={() => router.push(`/clients/${id}`)}
          onCancel={() => router.push(`/clients/${id}`)}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/clients/\[id\]/edit/
git commit -m "feat(web): add dedicated /clients/[id]/edit page"
```

---

## Task 19: Update client detail page — navigate to /edit instead of Sheet

**Files:**

- Modify: `apps/web/src/features/clients/components/client-detail.tsx`

- [ ] **Step 1: Replace Sheet edit with navigation**

In `apps/web/src/features/clients/components/client-detail.tsx`, make these changes:

1. Remove the `formOpen` state and `ClientForm` import/usage
2. Change the "Editar" button to navigate to `/clients/{id}/edit`
3. Update breadcrumb to use `PageBreadcrumb`

Remove these imports/state:

```typescript
// Remove:
import { ClientForm } from './client-form'

// Remove from state:
const [formOpen, setFormOpen] = useState(false)
```

Change the edit button:

```tsx
// Replace: onClick={() => setFormOpen(true)}
// With:
onClick={() => router.push(`/clients/${clientId}/edit`)}
```

Remove the `ClientForm` JSX at the bottom of the return:

```tsx
// Remove the entire <ClientForm ... /> block
```

Replace the breadcrumb navigation (lines 89-101) with:

```tsx
<PageBreadcrumb
  items={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Clientes', href: '/clients' },
    { label: client.name },
  ]}
/>
```

Add the import at the top:

```typescript
import { PageBreadcrumb } from '@/components/page-breadcrumb'
```

Remove the `useState` for `formOpen` (keep `deleteOpen`).

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/clients/components/client-detail.tsx
git commit -m "refactor(web): replace Sheet edit with /clients/[id]/edit navigation"
```

---

## Task 20: Delete old table components

**Files:**

- Delete: `apps/web/src/features/clients/components/clients-table-rows.tsx`
- Delete: `apps/web/src/features/clients/components/client-row.tsx`

- [ ] **Step 1: Verify no other files import these**

```bash
grep -rn "clients-table-rows\|client-row" apps/web/src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

These should only be imported by the old `clients-table.tsx` which was rewritten in Task 14. If any other file imports them, update those imports first.

- [ ] **Step 2: Delete the files**

```bash
rm apps/web/src/features/clients/components/clients-table-rows.tsx
rm apps/web/src/features/clients/components/client-row.tsx
```

- [ ] **Step 3: Run typecheck and build**

```bash
pnpm typecheck && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add -u apps/web/src/features/clients/components/
git commit -m "chore(web): remove old table row components replaced by TanStack"
```

---

## Task 21: Run quality gates and fix issues

**Files:**

- Potentially any modified file

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Fix any linting errors.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Fix any type errors.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Fix any build errors.

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Fix any failing tests. The backend tests for `list-clients` may need updating if they test query params.

- [ ] **Step 5: Commit fixes if any**

```bash
git add -A
git commit -m "fix(web): resolve lint, type, and test issues from Zenith migration"
```

---

## Task 22: Manual QA via Playwright MCP

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Wait for all apps to be ready.

- [ ] **Step 2: Navigate to /clients and take a screenshot**

Use Playwright MCP to navigate to `http://localhost:3000/clients` and take a full-page screenshot at 1440px width. Verify:

- Breadcrumb shows "Dashboard > Clientes"
- Page header with title, description, "+ Novo Cliente" button
- Tab group filters (Todos | Lead | Cliente | Ex-cliente)
- Toolbar with search, Columns toggle, Import, Export
- TanStack table with sortable headers, avatar cells, badge types, sparklines
- Pagination with "Mostrando X-Y de Z" and Rows selector

- [ ] **Step 3: Test filter tabs**

Click each tab (Lead, Cliente, Ex-cliente) and verify the table filters correctly. Click "Todos" to reset.

- [ ] **Step 4: Test sorting**

Click the "Nome" header to sort ascending, click again for descending. Verify rows reorder.

- [ ] **Step 5: Test pagination**

Change "Linhas" to 10, click "Próximo", verify page 2 loads. Click "Anterior" to go back.

- [ ] **Step 6: Test Columns toggle**

Click "Colunas", uncheck "Documento", verify column disappears. Re-check it.

- [ ] **Step 7: Navigate to /clients/new**

Click "+ Novo Cliente", verify:

- Breadcrumb: "Dashboard > Clientes > Novo Cliente"
- Form inside a bordered card
- All fields present
- Cancel navigates back to /clients

- [ ] **Step 8: Test mobile at 375px**

Resize to 375px width. Verify:

- Table hidden, cards shown
- Cards show avatar, name, document, type badge, email, phone
- "+ Novo Cliente" button visible
- Pagination works

- [ ] **Step 9: Save screenshots as evidence**

Save desktop and mobile screenshots to `audit/` directory.
