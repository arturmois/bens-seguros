'use client'

import type { VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import type { ListClientsSortOrder } from '@/api/model'
import { useOrgs } from '@/features/org/hooks/use-orgs'

import { useClients, useDeleteClient } from '../hooks/use-clients'
import {
  ACTIVE_POLICY_FILTER_OPTIONS,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
} from '../lib/constants'
import { isSortBy } from '../lib/type-guards'
import type { ClientData } from '../lib/types'
import { ClientCard } from './client-card'
import { ClientExportButton } from './client-export-button'
import { ClientImportButton } from './client-import-button'
import { createClientColumns } from './clients-columns'
import { NewClientButton } from './new-client-button'

function parseHasActivePolicy(value: string): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function ClientsContent() {
  'use no memo'
  const router = useRouter()
  const pagination = useCursorPagination()
  const { activeOrg } = useOrgs()
  const role = activeOrg?.role ?? 'VIEWER'

  const [search, setSearch] = useState('')
  const [activePolicyFilter, setActivePolicyFilter] = useState('')
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
    hasActivePolicy: parseHasActivePolicy(activePolicyFilter),
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
      onDelete: (id: string) => setDeletingClientId(id),
    }),
    [router]
  )

  const columns = useMemo(
    () => createClientColumns(columnActions, role),
    [columnActions, role]
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

  function handleActivePolicyFilterChange(value: string) {
    setActivePolicyFilter(value)
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <FilterTabs
        options={ACTIVE_POLICY_FILTER_OPTIONS}
        value={activePolicyFilter}
        onChange={handleActivePolicyFilterChange}
      />

      <TableToolbar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar clientes..."
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <ClientImportButton />
        <ClientExportButton
          filters={{
            search: debouncedSearch || undefined,
            hasActivePolicy: parseHasActivePolicy(activePolicyFilter),
          }}
        />
        <NewClientButton />
      </TableToolbar>

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyMessage="Nenhum cliente encontrado."
        columnVisibility={columnVisibility}
        onRowClick={(client) => router.push(`/clients/${client.id}`)}
      />

      <MobileCardList
        data={clients}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="Nenhum cliente encontrado."
        renderCard={(client) => (
          <ClientCard
            client={client}
            onDelete={(id) => setDeletingClientId(id)}
          />
        )}
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
