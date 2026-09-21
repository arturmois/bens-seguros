'use client'

import type { VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { DollarSign } from 'lucide-react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import type { FilterValue } from '@/components/shared/filter-types'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import type { ListCommissionsSortOrder } from '@/api/model'
import { useCommissions } from '../hooks/use-commissions'
import { useCommissionsFilters } from '../hooks/use-commissions-filters'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
} from '../lib/constants'
import { COMMISSION_FILTERS } from '../lib/filters'
import { isSortBy } from '../lib/type-guards'
import type { CommissionData } from '../lib/types'
import { CommissionCard } from './commission-card'
import { CommissionExportButton } from './commission-export-button'
import { createCommissionColumns } from './commissions-columns'

export function CommissionsTable() {
  'use no memo'
  const router = useRouter()
  const pagination = useCursorPagination()
  const filters = useCommissionsFilters()
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
  const sortOrder: ListCommissionsSortOrder | undefined = sorting[0]?.desc
    ? 'desc'
    : 'asc'
  const { data, isLoading, isError, refetch } = useCommissions({
    search: debouncedSearch || undefined,
    statusIn: filters.apiParams.statusIn,
    dateFrom: filters.apiParams.dateFrom,
    dateTo: filters.apiParams.dateTo,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
    sortBy,
    sortOrder,
  })
  const commissions: CommissionData[] = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const nextCursor = data?.meta?.nextCursor ?? null
  const columns = useMemo(() => createCommissionColumns(), [])
  const table = useReactTable({
    data: commissions,
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
        message="Erro ao carregar comissões."
        onRetry={refetch}
      />
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={filters.setSearch}
        searchPlaceholder="Buscar comissões..."
        filters={COMMISSION_FILTERS}
        values={filters.values}
        onFilterChange={handleFilterChange}
        onClearAll={filters.clearAll}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <CommissionExportButton
          filters={{
            search: debouncedSearch || undefined,
            statusIn: filters.apiParams.statusIn,
            dateFrom: filters.apiParams.dateFrom,
            dateTo: filters.apiParams.dateTo,
          }}
        />
      </UnifiedFilterBar>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<DollarSign className="size-10 text-muted-foreground/50" />}
        emptyMessage="Nenhuma comissão encontrada."
        emptyDescription="As comissões serão criadas automaticamente ao emitir apólices."
        columnVisibility={columnVisibility}
        onRowClick={(commission) =>
          router.push(`/commissions/${commission.id}`)
        }
      />
      <MobileCardList
        data={commissions}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyIcon={<DollarSign className="size-10 text-muted-foreground/50" />}
        emptyMessage="Nenhuma comissão encontrada."
        emptyDescription="As comissões serão criadas automaticamente ao emitir apólices."
        renderCard={(commission) => <CommissionCard commission={commission} />}
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
