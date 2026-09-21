'use client'

import type { SortingState, VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import {
  ListInsurersActive,
  type ListInsurersSortBy,
  type ListInsurersSortOrder,
} from '@/api/model'
import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import type { FilterValue } from '@/components/shared/filter-types'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useOrgs } from '@/features/org/hooks/use-orgs'

import { useInsurers, useUpdateInsurerMutation } from '../hooks/use-insurers'
import { useInsurersFilters } from '../hooks/use-insurers-filters'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
} from '../lib/constants'
import { INSURER_FILTERS } from '../lib/filters'
import { isInsurerSortBy } from '../lib/type-guards'
import type { InsurerData } from '../lib/types'
import { InsurerCard } from './insurer-card'
import { InsurerCreateButton } from './insurer-create-button'
import { createInsurerColumns } from './insurers-columns'

function toActiveParam(
  value: boolean | undefined
): (typeof ListInsurersActive)[keyof typeof ListInsurersActive] | undefined {
  if (value === undefined) return undefined
  return value ? ListInsurersActive.true : ListInsurersActive.false
}

export function InsurersTable() {
  'use no memo'
  const router = useRouter()
  const pagination = useCursorPagination()
  const filters = useInsurersFilters()
  const { activeOrg } = useOrgs()
  const role = activeOrg?.role ?? 'VIEWER'
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const debouncedSearch = useDebounce(filters.search, 300)
  const { mutate: updateInsurerMutate } = useUpdateInsurerMutation()
  const sortId = sorting[0]?.id
  const sortBy: ListInsurersSortBy | undefined =
    sortId !== undefined && isInsurerSortBy(sortId) ? sortId : undefined
  const sortOrder: ListInsurersSortOrder | undefined =
    sorting[0] !== undefined ? (sorting[0].desc ? 'desc' : 'asc') : undefined
  const { data, isLoading, isError, refetch } = useInsurers({
    active: toActiveParam(filters.apiParams.active),
    search: debouncedSearch || undefined,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
    sortBy,
    sortOrder,
  })
  const insurers: InsurerData[] = useMemo(
    () => [...(data?.data ?? [])],
    [data?.data]
  )
  const nextCursor = data?.meta?.nextCursor ?? null
  const knownTotal =
    (pagination.currentPage - 1) * pagination.pageSize + insurers.length
  const columnActions = useMemo(
    () => ({
      onEdit: (insurer: InsurerData) => {
        router.push(`/insurers/${insurer.id}/edit`)
      },
      onToggleActive: (insurer: InsurerData) => {
        updateInsurerMutate({
          id: insurer.id,
          body: {
            name: insurer.name,
            code: insurer.code ?? '',
            active: !insurer.active,
          },
        })
      },
    }),
    [router, updateInsurerMutate]
  )
  const columns = useMemo(
    () => createInsurerColumns(columnActions, role),
    [columnActions, role]
  )
  const table = useReactTable({
    data: insurers,
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
  })
  function handleSearchChange(value: string) {
    filters.setSearch(value)
    pagination.reset()
  }
  function handleFilterChange(key: string, value: FilterValue) {
    filters.setFilter(key, value)
    pagination.reset()
  }
  function handleClearAll() {
    filters.clearAll()
    pagination.reset()
  }
  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }
  const hasFilters =
    Boolean(debouncedSearch) || filters.apiParams.active === false
  const emptyMessage = hasFilters
    ? 'Nenhuma seguradora encontrada'
    : 'Nenhuma seguradora cadastrada'
  const emptyDescription = hasFilters
    ? 'Ajuste a busca ou os filtros para encontrar um cadastro existente.'
    : 'Cadastre a primeira seguradora para liberar a operação.'
  if (isError) {
    return (
      <TableErrorState
        message="Erro ao carregar seguradoras."
        onRetry={refetch}
      />
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar por nome ou código..."
        filters={INSURER_FILTERS}
        values={filters.values}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <InsurerCreateButton />
      </UnifiedFilterBar>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<Building2 className="size-10 text-muted-foreground/50" />}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        columnVisibility={columnVisibility}
        onRowClick={columnActions.onEdit}
      />
      <MobileCardList
        data={insurers}
        keyExtractor={(insurer) => insurer.id}
        isLoading={isLoading}
        emptyIcon={<Building2 className="size-10 text-muted-foreground/50" />}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        renderCard={(insurer) => (
          <InsurerCard
            insurer={insurer}
            onEdit={columnActions.onEdit}
            onToggleActive={columnActions.onToggleActive}
          />
        )}
      />
      <CursorPagination
        total={knownTotal}
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
