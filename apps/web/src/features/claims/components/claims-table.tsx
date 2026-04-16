'use client'

import type { VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import type { ListClaimsSortOrder } from '@/api/model'
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { ToolbarFilterSelect } from '@/components/shared/toolbar-filter-select'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useOrgs } from '@/features/org/hooks/use-orgs'
import { useClaims, useDeleteClaim } from '../hooks/use-claims'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
  PRIORITY_FILTER_OPTIONS,
  STATUS_SELECT_OPTIONS,
} from '../lib/constants'
import { isClaimPriority, isClaimStatus, isSortBy } from '../lib/type-guards'
import type { ClaimData } from '../lib/types'
import { ClaimCard } from './claim-card'
import { createClaimColumns } from './claims-columns'

export function ClaimsTable() {
  'use no memo'
  const router = useRouter()
  const pagination = useCursorPagination()
  const { activeOrg } = useOrgs()
  const role = activeOrg?.role ?? 'VIEWER'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const sortId = sorting[0]?.id
  const sortBy = sortId && isSortBy(sortId) ? sortId : undefined
  const sortOrder: ListClaimsSortOrder | undefined = sorting[0]?.desc
    ? 'desc'
    : 'asc'

  const statusParam =
    statusFilter && isClaimStatus(statusFilter) ? statusFilter : undefined
  const priorityParam =
    priorityFilter && isClaimPriority(priorityFilter)
      ? priorityFilter
      : undefined

  const { data, isLoading, isError, refetch } = useClaims({
    search: debouncedSearch || undefined,
    status: statusParam,
    priority: priorityParam,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
    sortBy,
    sortOrder,
  })

  const deleteClaim = useDeleteClaim()

  const claims: ClaimData[] = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const nextCursor = data?.meta?.nextCursor ?? null

  const columnActions = useMemo(
    () => ({
      onView: (id: string) => router.push(`/claims/${id}`),
      onDelete: (id: string) => setDeletingClaimId(id),
    }),
    [router]
  )

  const columns = useMemo(
    () => createClaimColumns(columnActions, role),
    [columnActions, role]
  )

  const table = useReactTable({
    data: claims,
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

  function handlePriorityFilterChange(value: string) {
    setPriorityFilter(value)
    pagination.reset()
  }

  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }

  function handleConfirmDelete() {
    if (deletingClaimId) {
      deleteClaim.mutate(deletingClaimId, {
        onSuccess: () => setDeletingClaimId(null),
      })
    }
  }

  if (isError) {
    return (
      <TableErrorState
        message="Erro ao carregar sinistros."
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <FilterTabs
        options={PRIORITY_FILTER_OPTIONS}
        value={priorityFilter}
        onChange={handlePriorityFilterChange}
      />

      <TableToolbar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar sinistros..."
        filters={
          <ToolbarFilterSelect
            value={statusFilter}
            onValueChange={handleStatusFilterChange}
            allLabel="Todos status"
            allValue=""
            options={STATUS_SELECT_OPTIONS.filter((opt) => opt.value !== '')}
            widthClass="w-[170px]"
          />
        }
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      ></TableToolbar>

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<ShieldAlert className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhum sinistro encontrado."
        emptyDescription="Registre um novo sinistro para começar."
        columnVisibility={columnVisibility}
        onRowClick={(claim) => router.push(`/claims/${claim.id}`)}
      />

      <MobileCardList
        data={claims}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyIcon={<ShieldAlert className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhum sinistro encontrado."
        emptyDescription="Registre um novo sinistro para começar."
        renderCard={(claim) => <ClaimCard claim={claim} />}
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

      <ConfirmDeleteDialog
        entityLabel="sinistro"
        open={Boolean(deletingClaimId)}
        onOpenChange={(open) => {
          if (!open) setDeletingClaimId(null)
        }}
        onConfirm={handleConfirmDelete}
        isPending={deleteClaim.isPending}
      />
    </div>
  )
}
