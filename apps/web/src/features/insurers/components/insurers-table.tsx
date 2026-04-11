'use client'

import type { SortingState, VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Building2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'

import { useInsurers, useUpdateInsurerMutation } from '../hooks/use-insurers'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
  STATUS_FILTER_OPTIONS,
} from '../lib/constants'
import type { InsurerData, InsurerStatusFilter } from '../lib/types'
import { InsurerCard } from './insurer-card'
import { InsurerFormSheet } from './insurer-form-sheet'
import { createInsurerColumns } from './insurers-columns'

function isStatusFilter(value: string): value is InsurerStatusFilter {
  return value === 'ALL' || value === 'ACTIVE' || value === 'INACTIVE'
}

function resolveActiveFilter(status: InsurerStatusFilter): boolean | undefined {
  if (status === 'ALL') return undefined
  return status === 'ACTIVE'
}

export function InsurersTable() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<InsurerStatusFilter>('ACTIVE')
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [editingInsurer, setEditingInsurer] = useState<InsurerData | undefined>(
    undefined
  )
  const [formOpen, setFormOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const { mutate: updateInsurerMutate } = useUpdateInsurerMutation()

  const { data, isLoading, isError, refetch } = useInsurers({
    active: resolveActiveFilter(statusFilter),
    search: debouncedSearch || undefined,
  })

  const insurers: InsurerData[] = useMemo(
    () => [...(data?.data ?? [])],
    [data?.data]
  )

  const columnActions = useMemo(
    () => ({
      onEdit: (insurer: InsurerData) => {
        setEditingInsurer(insurer)
        setFormOpen(true)
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
    [updateInsurerMutate]
  )

  const columns = useMemo(
    () => createInsurerColumns(columnActions),
    [columnActions]
  )

  const table = useReactTable({
    data: insurers,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  function handleCreate() {
    setEditingInsurer(undefined)
    setFormOpen(true)
  }

  function handleStatusFilterChange(value: string) {
    if (isStatusFilter(value)) setStatusFilter(value)
  }

  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }

  const hasFilters = Boolean(debouncedSearch) || statusFilter !== 'ACTIVE'
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
      <FilterTabs
        options={STATUS_FILTER_OPTIONS}
        value={statusFilter}
        onChange={handleStatusFilterChange}
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou código..."
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <Button onClick={handleCreate}>
          <Plus className="size-4 sm:mr-2" />
          <span className="hidden sm:inline">Nova seguradora</span>
        </Button>
      </TableToolbar>

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<Building2 className="text-muted-foreground/50 size-10" />}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        columnVisibility={columnVisibility}
        onRowClick={columnActions.onEdit}
      />

      <MobileCardList
        data={insurers}
        keyExtractor={(insurer) => insurer.id}
        isLoading={isLoading}
        emptyIcon={<Building2 className="text-muted-foreground/50 size-10" />}
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

      <InsurerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        insurer={editingInsurer}
      />
    </div>
  )
}
