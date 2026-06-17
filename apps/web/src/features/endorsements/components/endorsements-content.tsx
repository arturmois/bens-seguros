'use client'

import dynamic from 'next/dynamic'

import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { useProposalsFilters } from '@/features/proposals/hooks/use-proposals-filters'

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-3">
          <Skeleton className="h-8 w-full rounded-md" />
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

export function EndorsementsContent() {
  const filters = useProposalsFilters()
  return (
    <div className="flex flex-col gap-4">
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={filters.setSearch}
        searchPlaceholder="Buscar por apólice ou segurado..."
        filters={[]}
        values={filters.values}
        onFilterChange={filters.setFilter}
        onClearAll={filters.clearAll}
      />
      <ProposalKanban boardTypeOverride="ENDORSEMENT" />
    </div>
  )
}
