'use client'

import type { VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { Ambulance } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import type { ListAssistancesSortOrder } from '@/api/model'
import { Button } from '@/components/ui/button'
import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { ToolbarFilterSelect } from '@/components/shared/toolbar-filter-select'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useAssistances } from '../hooks/use-assistances'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
  STATUS_SELECT_OPTIONS,
  TYPE_FILTER_OPTIONS,
} from '../lib/constants'
import { isAssistanceStatus, isSortBy } from '../lib/type-guards'
import type { AssistanceData } from '../lib/types'
import { AssistanceCard } from './assistance-card'
import { createAssistanceColumns } from './assistances-columns'

export function AssistancesTable() {
  const router = useRouter()
  const pagination = useCursorPagination()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )

  const debouncedSearch = useDebounce(search, 300)

  const sortId = sorting[0]?.id
  const sortBy = sortId && isSortBy(sortId) ? sortId : undefined
  const sortOrder: ListAssistancesSortOrder | undefined = sorting[0]?.desc
    ? 'desc'
    : 'asc'

  const statusParam =
    statusFilter && isAssistanceStatus(statusFilter) ? statusFilter : undefined

  const { data, isLoading, isError, refetch } = useAssistances({
    search: debouncedSearch || undefined,
    status: statusParam,
    type: typeFilter || undefined,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
    sortBy,
    sortOrder,
  })

  const assistances: AssistanceData[] = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const nextCursor = data?.meta?.nextCursor ?? null

  const columns = useMemo(() => createAssistanceColumns(), [])

  const table = useReactTable({
    data: assistances,
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

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value)
    pagination.reset()
  }

  function handleTypeFilterChange(value: string) {
    setTypeFilter(value)
    pagination.reset()
  }

  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }

  if (isError) {
    return (
      <TableErrorState
        message="Erro ao carregar assistências."
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <FilterTabs
        options={TYPE_FILTER_OPTIONS}
        value={typeFilter}
        onChange={handleTypeFilterChange}
      />

      <TableToolbar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar assistências..."
        filters={
          <ToolbarFilterSelect
            value={statusFilter}
            onValueChange={handleStatusFilterChange}
            allLabel="Todos status"
            allValue=""
            options={STATUS_SELECT_OPTIONS.filter((opt) => opt.value !== '')}
            widthClass="w-[180px]"
          />
        }
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <Button size="sm" render={<Link href="/assistances/new" />}>
          Nova Assistência
        </Button>
      </TableToolbar>

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<Ambulance className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhuma assistência encontrada."
        emptyDescription="Registre uma nova assistência para começar."
        columnVisibility={columnVisibility}
        onRowClick={(assistance) =>
          router.push(`/assistances/${assistance.id}`)
        }
      />

      <MobileCardList
        data={assistances}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        emptyIcon={<Ambulance className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhuma assistência encontrada."
        emptyDescription="Registre uma nova assistência para começar."
        renderCard={(assistance) => <AssistanceCard assistance={assistance} />}
      />

      <CursorPagination
        total={total}
        pageSize={pagination.pageSize}
        currentPage={pagination.currentPage}
        onPageSizeChange={pagination.setPageSize}
        hasPreviousPage={pagination.hasPreviousPage}
        hasNextPage={Boolean(nextCursor)}
        onPrevious={pagination.goToPrevious}
        onNext={() => {
          if (nextCursor) pagination.goToNext(nextCursor)
        }}
      />
    </div>
  )
}
