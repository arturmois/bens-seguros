'use client'

import type { SortingState, VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MessageCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { useDebounce } from '@/hooks/use-debounce'

import { useOrgs } from '@/features/org/hooks/use-orgs'
import { useChannels } from '../hooks/use-channels'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
  STATUS_FILTER_OPTIONS,
} from '../lib/constants'
import {
  isChannelStatusFilter,
  matchesSearch,
  matchesStatus,
} from '../lib/filters'
import type { ChannelStatusFilter } from '../lib/types'
import type { ChannelData } from '../types'
import { ChannelCard } from './channel-card'
import { createChannelColumns } from './channels-columns'

interface ChannelsTableProps {
  readonly onEdit: (channel: ChannelData) => void
  readonly onQrCode: (channel: ChannelData) => void
  readonly onEmbed: (channel: ChannelData) => void
  readonly onDeactivate: (channel: ChannelData) => void
}

export function ChannelsTable({
  onEdit,
  onQrCode,
  onEmbed,
  onDeactivate,
}: ChannelsTableProps) {
  'use no memo'
  const { activeOrg } = useOrgs()
  const role = activeOrg?.role ?? 'VIEWER'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ChannelStatusFilter>('ALL')
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )

  const debouncedSearch = useDebounce(search, 300)
  const { data, isLoading, isError, refetch } = useChannels()

  const channels = useMemo<ChannelData[]>(() => {
    const list = data ?? []
    return list.filter(
      (channel) =>
        matchesStatus(channel, statusFilter) &&
        matchesSearch(channel, debouncedSearch)
    )
  }, [data, statusFilter, debouncedSearch])

  const columnActions = useMemo(
    () => ({ onEdit, onQrCode, onEmbed, onDeactivate }),
    [onEdit, onQrCode, onEmbed, onDeactivate]
  )

  const columns = useMemo(
    () => createChannelColumns(columnActions, role),
    [columnActions, role]
  )

  const table = useReactTable({
    data: channels,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  function handleStatusFilterChange(value: string) {
    if (isChannelStatusFilter(value)) setStatusFilter(value)
  }

  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }

  const totalChannels = data?.length ?? 0
  const emptyMessage =
    totalChannels === 0 ? 'Nenhum canal conectado' : 'Nenhum canal encontrado'
  const emptyDescription =
    totalChannels === 0
      ? 'Conecte seu primeiro canal acima para começar a receber mensagens.'
      : 'Ajuste a busca ou os filtros para encontrar um canal existente.'

  if (isError) {
    return (
      <TableErrorState message="Erro ao carregar canais." onRetry={refetch} />
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
        searchPlaceholder="Buscar canais..."
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      />

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={
          <MessageCircle className="text-muted-foreground/50 size-10" />
        }
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        columnVisibility={columnVisibility}
        onRowClick={onEdit}
      />

      <MobileCardList
        data={channels}
        keyExtractor={(channel) => channel.id}
        isLoading={isLoading}
        emptyIcon={
          <MessageCircle className="text-muted-foreground/50 size-10" />
        }
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        renderCard={(channel) => (
          <ChannelCard
            channel={channel}
            onEdit={onEdit}
            onQrCode={onQrCode}
            onEmbed={onEmbed}
            onDeactivate={onDeactivate}
          />
        )}
      />
    </div>
  )
}
