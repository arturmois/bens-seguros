'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Columns3, List } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProposalsTable } from '@/features/proposals/components/proposals-table'

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

type ViewMode = 'table' | 'kanban'

export function ProposalsContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="flex gap-1 rounded-md border p-0.5">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            aria-label="Visualização em tabela"
          >
            <List className="mr-1.5 h-4 w-4" />
            Tabela
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            aria-label="Visualização em kanban"
          >
            <Columns3 className="mr-1.5 h-4 w-4" />
            Kanban
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <ProposalsTable allowedBoardTypes={['NEW_INSURANCE', 'RENEWAL']} />
      ) : (
        <ProposalKanban
          initialBoardType="NEW_INSURANCE"
          allowedBoardTypes={['NEW_INSURANCE', 'RENEWAL']}
        />
      )}
    </div>
  )
}
