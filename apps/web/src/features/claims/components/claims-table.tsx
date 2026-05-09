'use client'

import type { VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { ListClaimsSortOrder, ListClaimsStatusGroup } from '@/api/model'
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import type { FilterValue } from '@/components/shared/filter-types'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useOrgs } from '@/features/org/hooks/use-orgs'
import { useClaims, useDeleteClaim } from '../hooks/use-claims'
import { useClaimsFilters } from '../hooks/use-claims-filters'
import { ClaimCreateButton } from './claim-create-button'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
} from '../lib/constants'
import { CLAIM_FILTERS } from '../lib/filters'
import { isSortBy } from '../lib/type-guards'
import type { ClaimData } from '../lib/types'
import { ClaimCard } from './claim-card'
import { createClaimColumns } from './claims-columns'

const STATUS_GROUP_VALUES: readonly string[] = ['open', 'closed'] as const

function isStatusGroup(value: string): value is ListClaimsStatusGroup {
  return STATUS_GROUP_VALUES.includes(value)
}

export function ClaimsTable() {
  'use no memo'
  const router = useRouter()
  const pagination = useCursorPagination()
  const filters = useClaimsFilters()
  const { activeOrg } = useOrgs()
  const role = activeOrg?.role ?? 'VIEWER'

  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null)

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
  const sortOrder: ListClaimsSortOrder | undefined = sorting[0]?.desc
    ? 'desc'
    : 'asc'

  const statusGroupParam =
    filters.apiParams.statusGroup &&
    isStatusGroup(filters.apiParams.statusGroup)
      ? filters.apiParams.statusGroup
      : undefined

  const { data, isLoading, isError, refetch } = useClaims({
    search: debouncedSearch || undefined,
    statusIn: filters.apiParams.statusIn,
    priorityIn: filters.apiParams.priorityIn,
    statusGroup: statusGroupParam,
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

  function handleFilterChange(key: string, value: FilterValue) {
    filters.setFilter(key, value)
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
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={filters.setSearch}
        searchPlaceholder="Buscar sinistros..."
        filters={CLAIM_FILTERS}
        values={filters.values}
        onFilterChange={handleFilterChange}
        onClearAll={filters.clearAll}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <ClaimCreateButton />
      </UnifiedFilterBar>

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
