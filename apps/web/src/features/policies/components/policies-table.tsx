'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Shield } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useOrgs } from '@/features/org/hooks/use-orgs'
import { usePolicies } from '../hooks/use-policies'
import {
  DEFAULT_COLUMN_VISIBILITY,
  HIDEABLE_COLUMNS,
  POLICY_STATUSES,
  STATUS_FILTER_OPTIONS,
} from '../lib/constants'
import type { PolicyData, PolicyStatus } from '../lib/types'
import type { ListPoliciesBoardType } from '@/api/model'
import { CancelPolicyDialog } from './cancel-policy-dialog'
import { createPolicyColumns } from './policies-columns'
import { PolicyCard } from './policy-card'
import { PolicyExportButton } from './policy-export-button'

const BOARD_TYPE_VALUES: readonly string[] = [
  'NEW_INSURANCE',
  'RENEWAL',
  'ENDORSEMENT',
] as const

function isStatus(value: string): value is PolicyStatus {
  return (POLICY_STATUSES as readonly string[]).includes(value)
}

function isBoardType(value: string): value is ListPoliciesBoardType {
  return BOARD_TYPE_VALUES.includes(value)
}

export function PoliciesTable() {
  'use no memo'
  const router = useRouter()
  const searchParams = useSearchParams()
  const pagination = useCursorPagination()
  const { activeOrg } = useOrgs()
  const role = activeOrg?.role ?? 'VIEWER'

  const urlStatus = searchParams.get('status')
  const urlBoardType = searchParams.get('boardType')
  const urlCreatedFrom = searchParams.get('createdFrom')
  const urlCreatedTo = searchParams.get('createdTo')
  const urlEndDateFrom = searchParams.get('endDateFrom')
  const urlEndDateTo = searchParams.get('endDateTo')
  const urlFilter = searchParams.get('filter')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(
    urlStatus && isStatus(urlStatus) ? urlStatus : ''
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [cancelTarget, setCancelTarget] = useState<PolicyData | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const statusParam =
    statusFilter && isStatus(statusFilter) ? statusFilter : undefined

  const boardTypeParam =
    urlBoardType && isBoardType(urlBoardType) ? urlBoardType : undefined

  const expiring7dRange = useMemo(() => {
    if (urlFilter !== 'expiring-7d') return null
    const now = new Date()
    const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return {
      from: now.toISOString(),
      to: to.toISOString(),
    }
  }, [urlFilter])

  const endDateFrom = expiring7dRange?.from ?? urlEndDateFrom ?? undefined
  const endDateTo = expiring7dRange?.to ?? urlEndDateTo ?? undefined
  const createdFrom = urlCreatedFrom ?? undefined
  const createdTo = urlCreatedTo ?? undefined

  const { data, isLoading, isError, refetch } = usePolicies({
    search: debouncedSearch || undefined,
    status: statusParam,
    boardType: boardTypeParam,
    createdFrom,
    createdTo,
    endDateFrom,
    endDateTo,
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
      <TableErrorState message="Erro ao carregar apólices." onRetry={refetch} />
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
        searchPlaceholder="Buscar por número ou cliente..."
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <PolicyExportButton
          filters={{
            search: debouncedSearch || undefined,
            status: statusParam,
          }}
        />
      </TableToolbar>

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
