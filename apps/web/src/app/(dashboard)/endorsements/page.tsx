'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

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

export default function EndorsementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Endossos</h1>
        <p className="text-muted-foreground text-sm">
          Pipeline operacional de endossos vinculados a apólices em vigor.
        </p>
      </div>

      <ProposalKanban
        initialBoardType="ENDORSEMENT"
        allowedBoardTypes={['ENDORSEMENT']}
        searchPlaceholder="Buscar por apólice ou segurado..."
      />
    </div>
  )
}
