'use client'

import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import type { ListClientsSortOrder } from '@/api/model'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { useClients, useDeleteClient } from '../hooks/use-clients'
import type { ClientData } from '../lib/constants'
import { DEFAULT_COLUMN_VISIBILITY, DEFAULT_SORTING } from '../lib/constants'
import { isClientType, isSortBy } from '../lib/type-guards'
import { ClientCards } from './client-cards'
import { createClientColumns } from './clients-columns'
import { ClientsDataTable } from './clients-data-table'
import { ClientsFilterTabs } from './clients-filter-tabs'
import { ClientsPagination } from './clients-pagination'
import { ClientsToolbar } from './clients-toolbar'
import { DeleteClientDialog } from './delete-client-dialog'

export function ClientsContent() {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [pageSize, setPageSize] = useState(10)
  const [cursors, setCursors] = useState<string[]>([])
  const currentCursor = cursors[cursors.length - 1]
  const currentPage = cursors.length + 1
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const deleteClient = useDeleteClient()

  const sortId = sorting[0]?.id
  const sortBy = sortId && isSortBy(sortId) ? sortId : undefined
  const sortOrder: ListClientsSortOrder | undefined = sorting[0]?.desc
    ? 'desc'
    : 'asc'

  const { data, isLoading, isError, refetch } = useClients({
    search: debouncedSearch || undefined,
    type: typeFilter && isClientType(typeFilter) ? typeFilter : undefined,
    cursor: currentCursor,
    limit: pageSize,
    sortBy,
    sortOrder,
  })

  const clients: ClientData[] = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const nextCursor = data?.meta?.nextCursor ?? null

  const columnActions = useMemo(
    () => ({
      onView: (id: string) => router.push(`/clients/${id}`),
      onEdit: (id: string) => router.push(`/clients/${id}/edit`),
      onDelete: (id: string) => setDeletingClientId(id),
    }),
    [router]
  )

  const columns = useMemo(
    () => createClientColumns(columnActions),
    [columnActions]
  )

  const table = useReactTable({
    data: clients,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex: 0, pageSize },
    },
    onSortingChange: (updater) => {
      setSorting(updater)
      setCursors([])
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
    rowCount: total,
  })

  function handleNextPage() {
    if (nextCursor) {
      setCursors((prev) => [...prev, nextCursor])
    }
  }

  function handlePreviousPage() {
    setCursors((prev) => prev.slice(0, -1))
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setCursors([])
  }

  function handleTypeFilterChange(value: string) {
    setTypeFilter(value)
    setCursors([])
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setCursors([])
  }

  function handleConfirmDelete() {
    if (!deletingClientId) return
    deleteClient.mutate(deletingClientId, {
      onSuccess: () => setDeletingClientId(null),
    })
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-destructive text-sm">
          Erro ao carregar os clientes.
        </p>
        <Button variant="link" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ClientsFilterTabs
        activeFilter={typeFilter}
        onFilterChange={handleTypeFilterChange}
      />

      <ClientsToolbar
        search={search}
        onSearchChange={handleSearchChange}
        currentFilters={{
          search: debouncedSearch || undefined,
          type: typeFilter && isClientType(typeFilter) ? typeFilter : undefined,
        }}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={(id, visible) =>
          setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
        }
        hideableColumns={[
          { id: 'document', label: 'Documento' },
          { id: 'type', label: 'Tipo' },
          { id: 'createdAt', label: 'Criado em' },
          { id: 'phone', label: 'Telefone' },
        ]}
      />

      <ClientsDataTable
        table={table}
        columnVisibility={columnVisibility}
        isLoading={isLoading}
        onRowClick={(id) => router.push(`/clients/${id}`)}
      />

      <ClientCards
        data={clients}
        isLoading={isLoading}
        onView={(id) => router.push(`/clients/${id}`)}
        onEdit={(id) => router.push(`/clients/${id}/edit`)}
        onDelete={(id) => setDeletingClientId(id)}
      />

      <ClientsPagination
        total={total}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        currentPage={currentPage}
        hasNextPage={nextCursor !== null}
        hasPreviousPage={cursors.length > 0}
        onNext={handleNextPage}
        onPrevious={handlePreviousPage}
      />

      <DeleteClientDialog
        open={deletingClientId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingClientId(null)
        }}
        onConfirm={handleConfirmDelete}
        isPending={deleteClient.isPending}
      />
    </div>
  )
}
