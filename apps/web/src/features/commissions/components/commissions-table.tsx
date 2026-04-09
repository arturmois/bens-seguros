'use client'

import type { VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { DollarSign } from 'lucide-react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import type { ListCommissionsSortOrder } from '@/api/model'
import { useCommissions } from '../hooks/use-commissions'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
  STATUS_FILTER_OPTIONS,
} from '../lib/constants'
import { isCommissionStatus, isSortBy } from '../lib/type-guards'
import type { CommissionData } from '../lib/types'
import { CommissionCard } from './commission-card'
import { CommissionExportButton } from './commission-export-button'
import { createCommissionColumns } from './commissions-columns'

export function CommissionsTable() {
  const router = useRouter()
  const pagination = useCursorPagination()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )

  const debouncedSearch = useDebounce(search, 300)

  const sortId = sorting[0]?.id
  const sortBy = sortId && isSortBy(sortId) ? sortId : undefined
  const sortOrder: ListCommissionsSortOrder | undefined = sorting[0]?.desc
    ? 'desc'
    : 'asc'

  const statusParam =
    statusFilter && isCommissionStatus(statusFilter) ? statusFilter : undefined

  const { data, isLoading, isError, refetch } = useCommissions({
    search: debouncedSearch || undefined,
    status: statusParam,
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

  function handleSearchChange(value: string) {
    setSearch(value)
    pagination.reset()
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value)
    pagination.reset()
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
      <FilterTabs
        options={STATUS_FILTER_OPTIONS}
        value={statusFilter}
        onChange={handleStatusFilterChange}
      />

      <TableToolbar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar comissões..."
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <CommissionExportButton
          filters={{
            search: debouncedSearch || undefined,
            status: statusParam,
          }}
        />
      </TableToolbar>

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<DollarSign className="text-muted-foreground/50 size-10" />}
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
        emptyIcon={<DollarSign className="text-muted-foreground/50 size-10" />}
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
