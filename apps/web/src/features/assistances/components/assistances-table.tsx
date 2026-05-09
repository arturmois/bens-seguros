'use client'

import type { VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { Ambulance } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  ListAssistancesSortOrder,
  ListAssistancesStatusGroup,
} from '@/api/model'
import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import type { FilterValue } from '@/components/shared/filter-types'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useAssistances } from '../hooks/use-assistances'
import { useAssistancesFilters } from '../hooks/use-assistances-filters'
import { AssistanceCreateButton } from './assistance-create-button'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
} from '../lib/constants'
import { ASSISTANCE_FILTERS } from '../lib/filters'
import { isSortBy } from '../lib/type-guards'
import type { AssistanceData } from '../lib/types'
import { AssistanceCard } from './assistance-card'
import { createAssistanceColumns } from './assistances-columns'

const STATUS_GROUP_VALUES: readonly string[] = ['open', 'closed'] as const

function isStatusGroup(value: string): value is ListAssistancesStatusGroup {
  return STATUS_GROUP_VALUES.includes(value)
}

export function AssistancesTable() {
  'use no memo'
  const router = useRouter()
  const pagination = useCursorPagination()
  const filters = useAssistancesFilters()

  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )

  const debouncedSearch = useDebounce(filters.search, 300)

  const filterFingerprint = JSON.stringify({
    ...filters.apiParams,
    search: debouncedSearch || undefined,
  })
  const lastFingerprint = useRef(filterFingerprint)
  useEffect(() => {
    if (lastFingerprint.current === filterFingerprint) return
    lastFingerprint.current = filterFingerprint
    pagination.reset()
  }, [filterFingerprint, pagination])

  const sortId = sorting[0]?.id
  const sortBy = sortId && isSortBy(sortId) ? sortId : undefined
  const sortOrder: ListAssistancesSortOrder | undefined = sorting[0]?.desc
    ? 'desc'
    : 'asc'

  const statusGroupParam =
    filters.apiParams.statusGroup &&
    isStatusGroup(filters.apiParams.statusGroup)
      ? filters.apiParams.statusGroup
      : undefined

  const { data, isLoading, isError, refetch } = useAssistances({
    search: debouncedSearch || undefined,
    statusIn: filters.apiParams.statusIn,
    typeIn: filters.apiParams.typeIn,
    statusGroup: statusGroupParam,
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

  function handleFilterChange(key: string, value: FilterValue) {
    filters.setFilter(key, value)
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
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={filters.setSearch}
        searchPlaceholder="Buscar assistências..."
        filters={ASSISTANCE_FILTERS}
        values={filters.values}
        onFilterChange={handleFilterChange}
        onClearAll={filters.clearAll}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <AssistanceCreateButton />
      </UnifiedFilterBar>

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
