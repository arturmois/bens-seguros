# Shared Table Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract generic table components, hook, and shared utils from the Clients feature so every module reuses them instead of copy-pasting.

**Architecture:** Composable primitives (DataTable, CursorPagination, FilterTabs, TableToolbar, MobileCardList, TableErrorState) + one hook (useCursorPagination) + consolidated shared utils. Clients is the guinea pig — refactored first, then validated.

**Tech Stack:** React 19, TanStack Table, shadcn/ui (@coss/style), Tailwind CSS 4, Next.js 16

**Spec:** `docs/superpowers/specs/2026-04-09-shared-table-primitives-design.md`

---

## File Map

### Create (shared)

| File                                                       | Responsibility                       |
| ---------------------------------------------------------- | ------------------------------------ |
| `apps/web/src/hooks/use-cursor-pagination.ts`              | Cursor stack state management        |
| `apps/web/src/components/shared/data-table.tsx`            | TanStack Table generic renderer      |
| `apps/web/src/components/shared/mobile-card-list.tsx`      | Responsive card list wrapper         |
| `apps/web/src/components/shared/cursor-pagination.tsx`     | Pagination UI with page size         |
| `apps/web/src/components/shared/filter-tabs.tsx`           | Tab-style filter buttons             |
| `apps/web/src/components/shared/table-toolbar.tsx`         | Search + column toggle + action slot |
| `apps/web/src/components/shared/table-error-state.tsx`     | Error message + retry button         |
| `apps/web/src/components/shared/confirm-delete-dialog.tsx` | Generic delete confirmation          |
| `apps/web/src/components/shared/detail-info-item.tsx`      | Icon + label + value display         |
| `apps/web/src/lib/extract-error-message.ts`                | API error message extraction         |
| `apps/web/src/lib/date-utils.ts`                           | parseDateString, formatDateToISO     |

### Modify

| File                                                                 | Change                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/web/src/lib/formatters.ts`                                     | Add `getInitials`, update `formatDate` to medium style |
| `apps/web/src/features/clients/components/clients-table.tsx`         | Rewrite to use shared primitives                       |
| `apps/web/src/features/clients/components/client-detail.tsx`         | Import shared DetailInfoItem, ConfirmDeleteDialog      |
| `apps/web/src/features/clients/components/client-form-fields.tsx`    | Import date utils from `@/lib/date-utils`              |
| `apps/web/src/features/clients/components/identification-fields.tsx` | Update import path for date utils                      |
| `apps/web/src/features/clients/components/personal-info-fields.tsx`  | Update import path for date utils                      |
| `apps/web/src/features/clients/hooks/use-clients.ts`                 | Import `extractErrorMessage` from `@/lib`              |
| `apps/web/src/features/clients/lib/constants.ts`                     | Move type aliases to types.ts, keep runtime values     |
| `apps/web/src/features/clients/lib/types.ts`                         | Add type aliases moved from constants.ts               |
| `apps/web/src/features/clients/components/clients-columns.tsx`       | Update import for formatDate                           |
| `apps/web/src/app/(dashboard)/clients/[id]/edit/page.tsx`            | Use `formatDateToISO` from `@/lib/date-utils`          |

### Delete (absorbed by shared)

| File                                                                | Replaced by                                                    |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/web/src/features/clients/components/clients-data-table.tsx`   | `@/components/shared/data-table`                               |
| `apps/web/src/features/clients/components/clients-pagination.tsx`   | `@/components/shared/cursor-pagination`                        |
| `apps/web/src/features/clients/components/clients-filter-tabs.tsx`  | `@/components/shared/filter-tabs`                              |
| `apps/web/src/features/clients/components/clients-toolbar.tsx`      | `@/components/shared/table-toolbar`                            |
| `apps/web/src/features/clients/components/client-cards.tsx`         | `@/components/shared/mobile-card-list` + new `client-card.tsx` |
| `apps/web/src/features/clients/components/client-detail-info.tsx`   | `@/components/shared/detail-info-item`                         |
| `apps/web/src/features/clients/components/delete-client-dialog.tsx` | `@/components/shared/confirm-delete-dialog`                    |
| `apps/web/src/features/clients/components/form-field.tsx`           | `@/components/shared/form-field` (already exists, identical)   |
| `apps/web/src/features/clients/lib/formatters.ts`                   | `@/lib/formatters` (getInitials+formatDate moved)              |

---

## Task 1: Shared Utils — extractErrorMessage, date-utils, formatters

**Files:**

- Create: `apps/web/src/lib/extract-error-message.ts`
- Create: `apps/web/src/lib/date-utils.ts`
- Modify: `apps/web/src/lib/formatters.ts`

- [ ] **Step 1: Create `extract-error-message.ts`**

```ts
// apps/web/src/lib/extract-error-message.ts

function isErrorResponse(
  data: unknown
): data is { error: { message: string } } {
  if (typeof data !== 'object' || data === null) return false
  if (!('error' in data)) return false
  const err = (data as Record<string, unknown>).error
  if (typeof err !== 'object' || err === null) return false
  if (!('message' in err)) return false
  return typeof (err as Record<string, unknown>).message === 'string'
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as Record<string, unknown>).response === 'object'
  ) {
    const response = (error as Record<string, unknown>).response as Record<
      string,
      unknown
    >
    if ('data' in response && isErrorResponse(response.data)) {
      return response.data.error.message
    }
  }
  return fallback
}
```

- [ ] **Step 2: Create `date-utils.ts`**

```ts
// apps/web/src/lib/date-utils.ts

export function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = value.includes('T')
    ? new Date(value)
    : new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

export function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00:00.000Z`
}

export function toInputDateString(isoDate: string): string {
  const d = new Date(isoDate)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

- [ ] **Step 3: Update `@/lib/formatters.ts`**

Replace the entire file content with:

```ts
// apps/web/src/lib/formatters.ts

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatCurrency(valueInCents: number): string {
  return currencyFormatter.format(valueInCents / 100)
}

export function formatDate(dateStr: string): string {
  return dateFormatter.format(new Date(dateStr))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: PASS (new files have no consumers yet, formatters.ts has same exports + getInitials)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/extract-error-message.ts apps/web/src/lib/date-utils.ts apps/web/src/lib/formatters.ts
git commit -m "feat(web): add shared utils — extractErrorMessage, date-utils, getInitials"
```

---

## Task 2: Shared Components — Hook + Table Primitives

**Files:**

- Create: `apps/web/src/hooks/use-cursor-pagination.ts`
- Create: `apps/web/src/components/shared/data-table.tsx`
- Create: `apps/web/src/components/shared/mobile-card-list.tsx`
- Create: `apps/web/src/components/shared/cursor-pagination.tsx`
- Create: `apps/web/src/components/shared/filter-tabs.tsx`
- Create: `apps/web/src/components/shared/table-toolbar.tsx`
- Create: `apps/web/src/components/shared/table-error-state.tsx`

- [ ] **Step 1: Create `useCursorPagination` hook**

```ts
// apps/web/src/hooks/use-cursor-pagination.ts
'use client'

import { useState } from 'react'

interface UseCursorPaginationReturn {
  currentCursor: string | undefined
  hasPreviousPage: boolean
  goToNext: (nextCursor: string) => void
  goToPrevious: () => void
  reset: () => void
  pageSize: number
  setPageSize: (size: number) => void
}

export function useCursorPagination(
  initialPageSize = 10
): UseCursorPaginationReturn {
  const [cursors, setCursors] = useState<string[]>([])
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  return {
    currentCursor: cursors.at(-1),
    hasPreviousPage: cursors.length > 0,
    goToNext: (nextCursor: string) =>
      setCursors((prev) => [...prev, nextCursor]),
    goToPrevious: () => setCursors((prev) => prev.slice(0, -1)),
    reset: () => setCursors([]),
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(size)
      setCursors([])
    },
  }
}
```

- [ ] **Step 2: Create `DataTable<T>`**

```tsx
// apps/web/src/components/shared/data-table.tsx
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

interface DataTableProps<T> {
  readonly table: TanStackTable<T>
  readonly isLoading: boolean
  readonly emptyMessage?: string
  readonly emptyIcon?: React.ReactNode
  readonly onRowClick?: (row: T) => void
  readonly skeletonRows?: number
}

export function DataTable<T>({
  table,
  isLoading,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyIcon,
  onRowClick,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const visibleColumns = table.getVisibleLeafColumns()
  const colCount = visibleColumns.length

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
            <LoadingRows colCount={colCount} rowCount={skeletonRows} />
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="h-32 text-center">
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  {emptyIcon}
                  <p>{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={
                  onRowClick
                    ? (e) => {
                        const target = e.target as HTMLElement
                        if (
                          target.closest(
                            'button, [role="menu"], [role="menuitem"], [role="dialog"], a'
                          )
                        )
                          return
                        onRowClick(row.original)
                      }
                    : undefined
                }
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

function LoadingRows({
  colCount,
  rowCount,
}: {
  readonly colCount: number
  readonly rowCount: number
}) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <TableRow key={`skeleton-${String(i)}`}>
          {Array.from({ length: colCount }).map((_, j) => (
            <TableCell key={`skeleton-${String(i)}-${String(j)}`}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
```

- [ ] **Step 3: Create `MobileCardList<T>`**

```tsx
// apps/web/src/components/shared/mobile-card-list.tsx
'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface MobileCardListProps<T> {
  readonly data: T[]
  readonly renderCard: (item: T, index: number) => React.ReactNode
  readonly keyExtractor: (item: T) => string
  readonly isLoading?: boolean
  readonly skeletonCount?: number
  readonly emptyMessage?: string
}

export function MobileCardList<T>({
  data,
  renderCard,
  keyExtractor,
  isLoading,
  skeletonCount = 3,
  emptyMessage = 'Nenhum registro encontrado.',
}: MobileCardListProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3 md:hidden">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={`card-skeleton-${String(i)}`}
            className="rounded-lg border p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm md:hidden">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3 md:hidden">
      {data.map((item, index) => (
        <div key={keyExtractor(item)}>{renderCard(item, index)}</div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create `CursorPagination`**

```tsx
// apps/web/src/components/shared/cursor-pagination.tsx
'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50] as const

interface CursorPaginationProps {
  readonly total: number
  readonly pageSize: number
  readonly onPageSizeChange: (size: number) => void
  readonly hasPreviousPage: boolean
  readonly hasNextPage: boolean
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly pageSizeOptions?: readonly number[]
}

export function CursorPagination({
  total,
  pageSize,
  onPageSizeChange,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: CursorPaginationProps) {
  const pageSizeItems = pageSizeOptions.map((size) => ({
    value: String(size),
    label: String(size),
  }))

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <span className="text-muted-foreground text-sm">
        {total} {total === 1 ? 'resultado' : 'resultados'}
      </span>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Linhas</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              if (value !== null) onPageSizeChange(Number(value))
            }}
            items={pageSizeItems}
          >
            <SelectTrigger className="h-8 w-16" size="sm">
              <SelectValue>
                {(value: string | null) => value ?? String(pageSize)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
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

- [ ] **Step 5: Create `FilterTabs`**

```tsx
// apps/web/src/components/shared/filter-tabs.tsx
'use client'

import { cn } from '@/lib/utils'

interface FilterTabsProps {
  readonly options: readonly { value: string; label: string }[]
  readonly value: string
  readonly onChange: (value: string) => void
}

export function FilterTabs({ options, value, onChange }: FilterTabsProps) {
  return (
    <div className="bg-muted flex w-fit items-center gap-1 rounded-lg p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Create `TableToolbar`**

```tsx
// apps/web/src/components/shared/table-toolbar.tsx
'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { Check, Search, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'

interface TableToolbarProps {
  readonly search: string
  readonly onSearchChange: (value: string) => void
  readonly searchPlaceholder?: string
  readonly columnVisibility?: VisibilityState
  readonly onColumnVisibilityChange?: (id: string, visible: boolean) => void
  readonly hideableColumns?: readonly { id: string; label: string }[]
  readonly children?: React.ReactNode
}

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  columnVisibility,
  onColumnVisibilityChange,
  hideableColumns,
  children,
}: TableToolbarProps) {
  const showColumnToggle =
    columnVisibility && onColumnVisibilityChange && hideableColumns?.length

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2" />
        <Input
          placeholder={searchPlaceholder}
          className="h-8 w-full ps-9 md:w-[320px]"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        {showColumnToggle && (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              <SlidersHorizontal className="size-4" />
              Colunas
            </PopoverTrigger>
            <PopoverPopup side="bottom" align="end" className="min-w-[160px]">
              <p className="text-muted-foreground px-2 pb-1.5 text-xs font-medium">
                Alternar colunas
              </p>
              {hideableColumns.map((col) => {
                const isVisible = columnVisibility[col.id] !== false
                return (
                  <button
                    key={col.id}
                    type="button"
                    className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                    onClick={() => onColumnVisibilityChange(col.id, !isVisible)}
                  >
                    <Check
                      className={`size-3.5 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {col.label}
                  </button>
                )
              })}
            </PopoverPopup>
          </Popover>
        )}
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create `TableErrorState`**

```tsx
// apps/web/src/components/shared/table-error-state.tsx
'use client'

import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface TableErrorStateProps {
  readonly message?: string
  readonly onRetry: () => void
}

export function TableErrorState({
  message = 'Erro ao carregar dados.',
  onRetry,
}: TableErrorStateProps) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-md border">
      <p className="text-destructive text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1 size-4" />
        Tentar novamente
      </Button>
    </div>
  )
}
```

- [ ] **Step 8: Run typecheck**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/hooks/use-cursor-pagination.ts apps/web/src/components/shared/data-table.tsx apps/web/src/components/shared/mobile-card-list.tsx apps/web/src/components/shared/cursor-pagination.tsx apps/web/src/components/shared/filter-tabs.tsx apps/web/src/components/shared/table-toolbar.tsx apps/web/src/components/shared/table-error-state.tsx
git commit -m "feat(web): add shared table primitives — DataTable, CursorPagination, FilterTabs, TableToolbar, MobileCardList, TableErrorState, useCursorPagination"
```

---

## Task 3: Shared Components — ConfirmDeleteDialog + DetailInfoItem

**Files:**

- Create: `apps/web/src/components/shared/confirm-delete-dialog.tsx`
- Create: `apps/web/src/components/shared/detail-info-item.tsx`

- [ ] **Step 1: Create `ConfirmDeleteDialog`**

```tsx
// apps/web/src/components/shared/confirm-delete-dialog.tsx
'use client'

import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmDeleteDialogProps {
  readonly entityLabel: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: () => void
  readonly isPending: boolean
}

export function ConfirmDeleteDialog({
  entityLabel,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {entityLabel}</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este {entityLabel}? Esta ação não
            pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create `DetailInfoItem`**

```tsx
// apps/web/src/components/shared/detail-info-item.tsx

interface DetailInfoItemProps {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: string
}

export function DetailInfoItem({ icon, label, value }: DetailInfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/shared/confirm-delete-dialog.tsx apps/web/src/components/shared/detail-info-item.tsx
git commit -m "feat(web): add shared ConfirmDeleteDialog and DetailInfoItem"
```

---

## Task 4: Reorganize Clients types and constants

Move type aliases from `constants.ts` to `types.ts`. Clean up `lib/formatters.ts` (to be deleted — consumers will import from `@/lib/formatters`).

**Files:**

- Modify: `apps/web/src/features/clients/lib/types.ts`
- Modify: `apps/web/src/features/clients/lib/constants.ts`
- Delete: `apps/web/src/features/clients/lib/formatters.ts`
- Modify: `apps/web/src/features/clients/components/clients-columns.tsx`
- Modify: `apps/web/src/features/clients/components/client-detail.tsx`
- Modify: `apps/web/src/features/clients/components/client-cards.tsx` (before it becomes client-card.tsx in Task 6)

- [ ] **Step 1: Update `types.ts` — add type aliases from constants.ts**

Replace the entire file:

```ts
// apps/web/src/features/clients/lib/types.ts

import type { z } from 'zod'

import type { CreateClientBody } from '@/api/endpoints/clients/clients.zod'
import type {
  GetClient200Data,
  ListClients200DataItem,
  ListClients200DataItemType,
} from '@/api/model'

export type ClientFormValues = z.infer<typeof CreateClientBody>

export type ClientType = ListClients200DataItemType

export type MaritalStatus =
  | 'SINGLE'
  | 'MARRIED'
  | 'DIVORCED'
  | 'WIDOWED'
  | 'OTHER'

export type ClientData = ListClients200DataItem

export type ClientDetail = GetClient200Data

export interface ClientFilters {
  readonly search?: string
  readonly type?: ClientType
  readonly cursor?: string
  readonly limit?: number
}
```

- [ ] **Step 2: Update `constants.ts` — remove type aliases, keep runtime values**

Replace the entire file:

```ts
// apps/web/src/features/clients/lib/constants.ts

import type { VisibilityState, SortingState } from '@tanstack/react-table'
import type { ClientType, MaritalStatus } from './types'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const TYPE_OPTIONS: readonly SelectOption<ClientType>[] = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'FORMER_CLIENT', label: 'Ex-Cliente' },
] as const

export const MARITAL_OPTIONS: readonly SelectOption<MaritalStatus>[] = [
  { value: 'SINGLE', label: 'Solteiro(a)' },
  { value: 'MARRIED', label: 'Casado(a)' },
  { value: 'DIVORCED', label: 'Divorciado(a)' },
  { value: 'WIDOWED', label: 'Viúvo(a)' },
  { value: 'OTHER', label: 'Outro' },
] as const

export const TYPE_LABELS: Record<ClientType, string> = {
  LEAD: 'Lead',
  CLIENT: 'Cliente',
  FORMER_CLIENT: 'Ex-Cliente',
}

export const TYPE_BADGE_VARIANT: Record<
  ClientType,
  'default' | 'warning' | 'destructive'
> = {
  LEAD: 'warning',
  CLIENT: 'default',
  FORMER_CLIENT: 'destructive',
}

export const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...TYPE_OPTIONS,
] as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  document: true,
  type: true,
  createdAt: true,
  phone: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'document', label: 'Documento' },
  { id: 'type', label: 'Tipo' },
  { id: 'createdAt', label: 'Criado em' },
  { id: 'phone', label: 'Telefone' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

export const EMPTY_FORM_VALUES = {
  name: '',
  document: '',
  personType: 'INDIVIDUAL' as const,
  type: 'LEAD' as const,
  email: '',
  phone: '',
  birthDate: '',
  profession: '',
  socialMedia: undefined,
}
```

- [ ] **Step 3: Update `clients-columns.tsx` — import formatDate from `@/lib/formatters`**

Change the import line:

```ts
// OLD
import { formatDate, getInitials } from '../lib/formatters'

// NEW
import { formatDate, getInitials } from '@/lib/formatters'
```

Also update the `ClientData` import:

```ts
// OLD
import type { ClientData } from '../lib/constants'

// NEW
import type { ClientData } from '../lib/types'
```

- [ ] **Step 4: Update `client-detail.tsx` — import getInitials from `@/lib/formatters`**

Change:

```ts
// OLD
import { getInitials } from '../lib/formatters'

// NEW
import { getInitials } from '@/lib/formatters'
```

Also update constants import — `TYPE_BADGE_VARIANT` and `TYPE_LABELS` stay in constants, but `ClientData`-like types should come from types:

No change needed here since `client-detail.tsx` doesn't import `ClientData` from constants.

- [ ] **Step 5: Update `client-cards.tsx` — import from `@/lib/formatters` and types**

Change:

```ts
// OLD
import type { ClientData } from '../lib/constants'
// ... (check actual imports)
import { getInitials } from '../lib/formatters'

// NEW
import type { ClientData } from '../lib/types'
import { getInitials } from '@/lib/formatters'
```

- [ ] **Step 6: Update any other files importing from `../lib/constants` for types**

Check `use-clients.ts` — update `ClientFilters` import:

```ts
// OLD
import type { ClientFilters } from '../lib/constants'

// NEW
import type { ClientFilters } from '../lib/types'
```

Check `type-guards.ts` — update `ClientType` import:

```ts
// OLD
import type { ClientType } from './constants'
import { TYPE_OPTIONS } from './constants'

// NEW
import type { ClientType } from './types'
import { TYPE_OPTIONS } from './constants'
```

- [ ] **Step 7: Delete `features/clients/lib/formatters.ts`**

```bash
rm apps/web/src/features/clients/lib/formatters.ts
```

- [ ] **Step 8: Run typecheck**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A apps/web/src/features/clients/lib/ apps/web/src/features/clients/components/clients-columns.tsx apps/web/src/features/clients/components/client-detail.tsx apps/web/src/features/clients/components/client-cards.tsx apps/web/src/features/clients/hooks/use-clients.ts
git commit -m "refactor(web): reorganize clients types/constants, consolidate formatters to @/lib"
```

---

## Task 5: Wire Clients hooks and form utils to shared

**Files:**

- Modify: `apps/web/src/features/clients/hooks/use-clients.ts`
- Modify: `apps/web/src/features/clients/components/client-form-fields.tsx`
- Modify: `apps/web/src/features/clients/components/identification-fields.tsx`
- Modify: `apps/web/src/features/clients/components/personal-info-fields.tsx`
- Modify: `apps/web/src/app/(dashboard)/clients/[id]/edit/page.tsx`
- Delete: `apps/web/src/features/clients/components/form-field.tsx`

- [ ] **Step 1: Update `use-clients.ts` — use shared extractErrorMessage**

Remove the local `extractErrorMessage` function (lines 28-38) and add import:

```ts
// ADD at top imports
import { extractErrorMessage } from '@/lib/extract-error-message'
```

Remove the entire `function extractErrorMessage(...)` block from the file.

- [ ] **Step 2: Update `client-form-fields.tsx` — import date utils from `@/lib`, FormField from shared**

Remove `parseDateString` and `formatDateToISO` function definitions (they now live in `@/lib/date-utils.ts`). Keep only the component and its exports:

```ts
// OLD imports
import type { ClientFormValues } from '../lib/types'
import { FormField } from './form-field'
import { IdentificationFields } from './identification-fields'
import { SocialMediaFields } from './social-media-fields'

// NEW imports
import type { ClientFormValues } from '../lib/types'
import { FormField } from '@/components/shared/form-field'
import { IdentificationFields } from './identification-fields'
import { SocialMediaFields } from './social-media-fields'
```

Remove the `parseDateString` and `formatDateToISO` function bodies. Keep the re-exports for backwards compatibility during transition:

```ts
export { parseDateString, formatDateToISO } from '@/lib/date-utils'
```

- [ ] **Step 3: Update `identification-fields.tsx` — import from `@/lib/date-utils` and shared FormField**

```ts
// OLD
import type { ClientFormValues } from '../lib/types'
import { formatDateToISO, parseDateString } from './client-form-fields'
import { FormField } from './form-field'

// NEW
import type { ClientFormValues } from '../lib/types'
import { formatDateToISO, parseDateString } from '@/lib/date-utils'
import { FormField } from '@/components/shared/form-field'
```

- [ ] **Step 4: Update `personal-info-fields.tsx` — same import changes**

```ts
// OLD
import type { ClientFormValues } from '../lib/types'
import { formatDateToISO, parseDateString } from './client-form-fields'
import { FormField } from './form-field'

// NEW
import type { ClientFormValues } from '../lib/types'
import { formatDateToISO, parseDateString } from '@/lib/date-utils'
import { FormField } from '@/components/shared/form-field'
```

- [ ] **Step 5: Update `social-media-fields.tsx` — import FormField from shared**

```ts
// OLD
import { FormField } from './form-field'

// NEW
import { FormField } from '@/components/shared/form-field'
```

- [ ] **Step 6: Update `[id]/edit/page.tsx` — use `toInputDateString` from `@/lib/date-utils`**

Replace the inline IIFE with the shared utility:

```ts
// ADD import
import { toInputDateString } from '@/lib/date-utils'

// Replace lines 88-96 (the birthDate IIFE) with:
birthDate: client.birthDate ? toInputDateString(client.birthDate) : '',
```

- [ ] **Step 7: Delete local form-field.tsx**

```bash
rm apps/web/src/features/clients/components/form-field.tsx
```

- [ ] **Step 8: Run typecheck**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A apps/web/src/features/clients/ apps/web/src/app/\(dashboard\)/clients/
git commit -m "refactor(web): wire clients to shared utils — extractErrorMessage, date-utils, FormField"
```

---

## Task 6: Rewrite Clients table to use shared primitives

This is the main task — replace client-specific table components with shared ones.

**Files:**

- Rewrite: `apps/web/src/features/clients/components/clients-table.tsx`
- Create: `apps/web/src/features/clients/components/client-card.tsx` (single card, extracted from client-cards.tsx)
- Modify: `apps/web/src/features/clients/components/client-detail.tsx` — use shared ConfirmDeleteDialog, DetailInfoItem
- Delete: `apps/web/src/features/clients/components/clients-data-table.tsx`
- Delete: `apps/web/src/features/clients/components/clients-pagination.tsx`
- Delete: `apps/web/src/features/clients/components/clients-filter-tabs.tsx`
- Delete: `apps/web/src/features/clients/components/clients-toolbar.tsx`
- Delete: `apps/web/src/features/clients/components/client-cards.tsx`
- Delete: `apps/web/src/features/clients/components/client-detail-info.tsx`
- Delete: `apps/web/src/features/clients/components/delete-client-dialog.tsx`

- [ ] **Step 1: Create `client-card.tsx` — single mobile card component**

```tsx
// apps/web/src/features/clients/components/client-card.tsx
'use client'

import { MoreHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { formatDocument } from '@/lib/masks'
import { getInitials } from '@/lib/formatters'
import type { ClientData } from '../lib/types'
import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants'

interface ClientCardProps {
  readonly client: ClientData
}

export function ClientCard({ client }: ClientCardProps) {
  const router = useRouter()

  return (
    <div
      className="hover:bg-accent/50 cursor-pointer rounded-lg border p-4 transition-colors"
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/clients/${client.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(`/clients/${client.id}`)
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {getInitials(client.name)}
          </div>
          <div>
            <p className="font-medium">{client.name}</p>
            <Badge variant={TYPE_BADGE_VARIANT[client.type]} className="mt-1">
              {TYPE_LABELS[client.type]}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
      <div className="text-muted-foreground mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="block font-medium">Documento</span>
          {formatDocument(client.document)}
        </div>
        <div>
          <span className="block font-medium">Tipo</span>
          {TYPE_LABELS[client.type]}
        </div>
        <div>
          <span className="block font-medium">E-mail</span>
          <span className="truncate">{client.email ?? '-'}</span>
        </div>
        <div>
          <span className="block font-medium">Telefone</span>
          {client.phone ?? '-'}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `clients-table.tsx` — orchestrator using shared primitives**

Replace the entire file:

```tsx
// apps/web/src/features/clients/components/clients-table.tsx
'use client'

import type { VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { useDebounce } from '@/hooks/use-debounce'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'

import type { ListClientsSortOrder } from '@/api/model'
import { useClients, useDeleteClient } from '../hooks/use-clients'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
  TYPE_FILTER_OPTIONS,
} from '../lib/constants'
import type { ClientData } from '../lib/types'
import { isClientType, isSortBy } from '../lib/type-guards'
import { ClientCard } from './client-card'
import { createClientColumns } from './clients-columns'

export function ClientsTable() {
  const router = useRouter()
  const pagination = useCursorPagination()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const deleteClient = useDeleteClient()

  const sortId = sorting[0]?.id
  const sortBy = sortId && isSortBy(sortId) ? sortId : undefined
  const sortOrder: ListClientsSortOrder | undefined = sorting[0]?.desc
    ? 'desc'
    : 'asc'

  const { data, isLoading, isError, refetch } = useClients({
    search: debouncedSearch || undefined,
    type: typeFilter && isClientType(typeFilter) ? typeFilter : undefined,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
    sortBy,
    sortOrder,
  })

  const clients: ClientData[] = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const nextCursor = data?.meta?.nextCursor ?? null

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

  const table = useReactTable({
    data: clients,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: (updater) => {
      setSorting(updater)
      pagination.reset()
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
    rowCount: total,
  })

  function handleSearchChange(value: string) {
    setSearch(value)
    pagination.reset()
  }

  function handleTypeFilterChange(value: string) {
    setTypeFilter(value)
    pagination.reset()
  }

  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }

  function handleConfirmDelete() {
    if (!deletingClientId) return
    deleteClient.mutate(deletingClientId, {
      onSuccess: () => setDeletingClientId(null),
    })
  }

  if (isError) {
    return (
      <TableErrorState message="Erro ao carregar clientes." onRetry={refetch} />
    )
  }

  return (
    <div className="space-y-4">
      <FilterTabs
        options={TYPE_FILTER_OPTIONS}
        value={typeFilter}
        onChange={handleTypeFilterChange}
      />

      <TableToolbar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar clientes..."
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      />

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyMessage="Nenhum cliente encontrado."
        onRowClick={(client) => router.push(`/clients/${client.id}`)}
      />

      <MobileCardList
        data={clients}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="Nenhum cliente encontrado."
        renderCard={(client) => <ClientCard client={client} />}
      />

      <CursorPagination
        total={total}
        pageSize={pagination.pageSize}
        onPageSizeChange={pagination.setPageSize}
        hasPreviousPage={pagination.hasPreviousPage}
        hasNextPage={Boolean(nextCursor)}
        onPrevious={pagination.goToPrevious}
        onNext={() => {
          if (nextCursor) pagination.goToNext(nextCursor)
        }}
      />

      <ConfirmDeleteDialog
        entityLabel="cliente"
        open={Boolean(deletingClientId)}
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

- [ ] **Step 3: Update `client-detail.tsx` — use shared components**

Replace imports:

```ts
// OLD
import { ClientDetailInfo } from './client-detail-info'

// NEW
import { DetailInfoItem } from '@/components/shared/detail-info-item'
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
```

Replace all `<ClientDetailInfo` with `<DetailInfoItem` (3 occurrences).

Replace the `<DeleteClientDialog` usage with `<ConfirmDeleteDialog`:

```tsx
// OLD
<DeleteClientDialog
  open={deleteOpen}
  onOpenChange={setDeleteOpen}
  onConfirm={handleConfirmDelete}
  isPending={deleteClient.isPending}
/>

// NEW
<ConfirmDeleteDialog
  entityLabel="cliente"
  open={deleteOpen}
  onOpenChange={setDeleteOpen}
  onConfirm={handleConfirmDelete}
  isPending={deleteClient.isPending}
/>
```

Remove the import of `DeleteClientDialog` from `./delete-client-dialog`.

- [ ] **Step 4: Delete absorbed files**

```bash
rm apps/web/src/features/clients/components/clients-data-table.tsx
rm apps/web/src/features/clients/components/clients-pagination.tsx
rm apps/web/src/features/clients/components/clients-filter-tabs.tsx
rm apps/web/src/features/clients/components/clients-toolbar.tsx
rm apps/web/src/features/clients/components/client-cards.tsx
rm apps/web/src/features/clients/components/client-detail-info.tsx
rm apps/web/src/features/clients/components/delete-client-dialog.tsx
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Run lint**

Run: `pnpm --filter @app/web lint`
Expected: PASS

- [ ] **Step 7: Run build**

Run: `pnpm --filter @app/web build`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A apps/web/src/features/clients/ apps/web/src/components/shared/
git commit -m "refactor(web): rewrite clients table with shared primitives — delete 7 client-specific files"
```

---

## Task 7: Final validation — lint, build, manual QA

- [ ] **Step 1: Run full quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build
```

Expected: all PASS

- [ ] **Step 2: QA via Playwright MCP**

Open browser to `http://localhost:3000/clients` and verify:

- Desktop: table renders with data, sort works, column visibility works, pagination works
- Filters: tabs filter by type, search filters by name
- Mobile (375px): cards render instead of table
- Create/Edit: forms still work, breadcrumbs correct
- Delete: confirmation dialog shows with "Excluir cliente" text
- Error state: shows retry button
- Dark mode: all elements visible

- [ ] **Step 3: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(web): address QA findings from shared table refactoring"
```

---

## Summary

| Task      | What                       | Files created  | Files deleted | Files modified  |
| --------- | -------------------------- | -------------- | ------------- | --------------- |
| 1         | Shared utils               | 2              | 0             | 1               |
| 2         | Table primitives + hook    | 7              | 0             | 0               |
| 3         | Delete dialog + info item  | 2              | 0             | 0               |
| 4         | Reorganize types/constants | 0              | 1             | 6               |
| 5         | Wire hooks + form utils    | 0              | 1             | 5               |
| 6         | Rewrite clients table      | 1              | 7             | 2               |
| 7         | Final validation           | 0              | 0             | 0               |
| **Total** |                            | **12 created** | **9 deleted** | **14 modified** |
