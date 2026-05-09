'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Columns3, List, Plus } from 'lucide-react'

import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { ViewToggle } from '@/components/shared/view-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { ProposalExportButton } from '@/features/proposals/components/proposal-export-button'
import { ProposalsTable } from '@/features/proposals/components/proposals-table'
import { useProposalsFilters } from '@/features/proposals/hooks/use-proposals-filters'
import { type BoardType } from '@/features/proposals/lib/constants'
import { PROPOSAL_FILTERS } from '@/features/proposals/lib/filters'

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-3">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}

const ProposalKanban = dynamic(
  () =>
    import('@/features/proposals/components/proposal-kanban').then(
      (m) => m.ProposalKanban
    ),
  {
    loading: () => <KanbanSkeleton />,
    ssr: false,
  }
)

const ALLOWED_BOARD_TYPES: readonly BoardType[] = [
  'NEW_INSURANCE',
  'RENEWAL',
] as const

const VIEW_OPTIONS = [
  { value: 'table' as const, label: 'Tabela', icon: List },
  { value: 'kanban' as const, label: 'Kanban', icon: Columns3 },
] as const

export function ProposalsContent() {
  const filters = useProposalsFilters()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={filters.setSearch}
        searchPlaceholder="Buscar propostas..."
        filters={PROPOSAL_FILTERS}
        values={filters.values}
        onFilterChange={filters.setFilter}
        onClearAll={filters.clearAll}
      >
        <ViewToggle
          value={filters.view}
          onChange={filters.setView}
          options={VIEW_OPTIONS}
          ariaLabel="Alternar visualização"
        />
        <ProposalExportButton filters={filters.apiParams} />
        <Button render={<Link href="/proposals/new" />}>
          <Plus className="size-4" />
          Nova Proposta
        </Button>
      </UnifiedFilterBar>

      {filters.view === 'table' ? (
        <ProposalsTable />
      ) : (
        <ProposalKanban allowedBoardTypes={ALLOWED_BOARD_TYPES} />
      )}
    </div>
  )
}
