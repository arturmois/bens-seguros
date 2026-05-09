'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import type { FilterValue } from '@/components/shared/filter-types'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useOrgs } from '@/features/org/hooks/use-orgs'
import { usePolicies } from '../hooks/use-policies'
import { usePoliciesFilters } from '../hooks/use-policies-filters'
import { DEFAULT_COLUMN_VISIBILITY, HIDEABLE_COLUMNS } from '../lib/constants'
import { POLICY_FILTERS } from '../lib/filters'
import type { PolicyData } from '../lib/types'
import { CancelPolicyDialog } from './cancel-policy-dialog'
import { createPolicyColumns } from './policies-columns'
import { PolicyCard } from './policy-card'
import { PolicyExportButton } from './policy-export-button'

export function PoliciesTable() {
  'use no memo'
  const router = useRouter()
  const pagination = useCursorPagination()
  const filters = usePoliciesFilters()
  const { activeOrg } = useOrgs()
  const role = activeOrg?.role ?? 'VIEWER'

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [cancelTarget, setCancelTarget] = useState<PolicyData | null>(null)

  const debouncedSearch = useDebounce(filters.search, 300)

  const apiParams = useMemo(
    () => ({
      ...filters.apiParams,
      search: debouncedSearch || undefined,
    }),
    [filters.apiParams, debouncedSearch]
  )

  const { data, isLoading, isError, refetch } = usePolicies({
    ...apiParams,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
  })

  const policies: PolicyData[] = data?.data ?? []
  const nextCursor = data?.meta?.nextCursor ?? null
  const knownTotal =
    (pagination.currentPage - 1) * pagination.pageSize + policies.length

  const columnActions = useMemo(
    () => ({
      onView: (id: string) => router.push(`/policies/${id}`),
      onCancel: (policy: PolicyData) => setCancelTarget(policy),
    }),
    [router]
  )

  const columns = useMemo(
    () => createPolicyColumns(columnActions, role),
    [columnActions, role]
  )

  const table = useReactTable({
    data: policies,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
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

  if (isError) {
    return (
      <TableErrorState message="Erro ao carregar apólices." onRetry={refetch} />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar por número ou cliente..."
        filters={POLICY_FILTERS}
        values={filters.values}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <PolicyExportButton filters={apiParams} />
      </UnifiedFilterBar>

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<Shield className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhuma apólice encontrada."
        emptyDescription="As apólices serão criadas a partir de propostas aprovadas."
        columnVisibility={columnVisibility}
        onRowClick={(policy) => router.push(`/policies/${policy.id}`)}
      />

      <MobileCardList
        data={policies}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyIcon={<Shield className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhuma apólice encontrada."
        emptyDescription="As apólices serão criadas a partir de propostas aprovadas."
        renderCard={(policy) => <PolicyCard policy={policy} />}
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

      <CancelPolicyDialog
        policy={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  )
}
