'use client'

import type { SortingState, VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Brain, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import type { FilterValue } from '@/components/shared/filter-types'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'

import { useOrgs } from '@/features/org/hooks/use-orgs'
import { useAiAgents } from '../hooks/use-ai-agents'
import { useAiAgentsFilters } from '../hooks/use-ai-agents-filters'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  DUPLICATE_PREFIX,
  HIDEABLE_COLUMNS,
  MAX_AGENT_NAME_LENGTH,
} from '../lib/constants'
import { AI_AGENT_FILTERS, matchesSearch, matchesStatus } from '../lib/filters'
import type { AiAgentData } from '../types'
import { AiAgentCard } from './ai-agent-card'
import { AiAgentFormDialog } from './ai-agent-form-dialog'
import { createAiAgentColumns } from './ai-agents-columns'
import { DeleteAgentDialog } from './delete-agent-dialog'

export function AiAgentsTable() {
  'use no memo'
  const { activeOrg } = useOrgs()
  const role = activeOrg?.role ?? 'VIEWER'
  const filters = useAiAgentsFilters()
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [editingAgent, setEditingAgent] = useState<AiAgentData | undefined>(
    undefined
  )
  const [formOpen, setFormOpen] = useState(false)
  const [deletingAgent, setDeletingAgent] = useState<AiAgentData | null>(null)
  const debouncedSearch = useDebounce(filters.search, 300)
  const { data, isLoading, isError, refetch } = useAiAgents()
  const agents = useMemo<AiAgentData[]>(() => {
    const list = data ?? []
    return list.filter(
      (agent) =>
        matchesStatus(agent, filters.active) &&
        matchesSearch(agent, debouncedSearch)
    )
  }, [data, filters.active, debouncedSearch])
  const columnActions = useMemo(
    () => ({
      onEdit: (agent: AiAgentData) => {
        setEditingAgent(agent)
        setFormOpen(true)
      },
      onDuplicate: (agent: AiAgentData) => {
        const duplicateName = `${DUPLICATE_PREFIX}${agent.name}`.slice(
          0,
          MAX_AGENT_NAME_LENGTH
        )
        setEditingAgent({
          ...agent,
          id: '',
          name: duplicateName,
          linkedChannelCount: 0,
        })
        setFormOpen(true)
      },
      onDelete: (agent: AiAgentData) => setDeletingAgent(agent),
    }),
    []
  )
  const columns = useMemo(
    () => createAiAgentColumns(columnActions, role),
    [columnActions, role]
  )
  const table = useReactTable({
    data: agents,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  function handleCreate() {
    setEditingAgent(undefined)
    setFormOpen(true)
  }
  function handleFilterChange(key: string, value: FilterValue) {
    filters.setFilter(key, value)
  }
  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }
  const totalAgents = data?.length ?? 0
  const emptyMessage =
    totalAgents === 0 ? 'Nenhum agente configurado' : 'Nenhum agente encontrado'
  const emptyDescription =
    totalAgents === 0
      ? 'Crie seu primeiro agente de IA para automatizar atendimentos.'
      : 'Ajuste a busca ou os filtros para encontrar um agente existente.'
  if (isError) {
    return (
      <TableErrorState message="Erro ao carregar agentes." onRetry={refetch} />
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={filters.setSearch}
        searchPlaceholder="Buscar agentes..."
        filters={AI_AGENT_FILTERS}
        values={filters.values}
        onFilterChange={handleFilterChange}
        onClearAll={filters.clearAll}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <Button onClick={handleCreate}>
          <Plus className="size-4 sm:mr-2" />
          <span className="hidden sm:inline">Novo agente</span>
        </Button>
      </UnifiedFilterBar>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<Brain className="text-muted-foreground/50 size-10" />}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        columnVisibility={columnVisibility}
        onRowClick={columnActions.onEdit}
      />
      <MobileCardList
        data={agents}
        keyExtractor={(agent) => agent.id}
        isLoading={isLoading}
        emptyIcon={<Brain className="text-muted-foreground/50 size-10" />}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        renderCard={(agent) => (
          <AiAgentCard
            agent={agent}
            onEdit={columnActions.onEdit}
            onDuplicate={columnActions.onDuplicate}
            onDelete={columnActions.onDelete}
          />
        )}
      />
      <AiAgentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        agent={editingAgent}
      />
      <DeleteAgentDialog
        open={deletingAgent !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingAgent(null)
        }}
        agent={deletingAgent}
      />
    </div>
  )
}
