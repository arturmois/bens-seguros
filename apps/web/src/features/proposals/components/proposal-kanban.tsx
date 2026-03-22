'use client'

import { DragDropProvider } from '@dnd-kit/react'
import { move } from '@dnd-kit/helpers'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'

import { groupByStage, useKanbanProposals } from '../hooks/use-kanban-proposals'
import { useAdvanceProposal, useRevertProposal } from '../hooks/use-proposals'
import type { BoardType, ProposalData, ProposalStage } from '../types'
import { STAGES } from '../types'
import { KanbanCardDetail } from './kanban-card-detail'
import { KanbanColumn } from './kanban-column'
import { KanbanSkeleton, KanbanToolbar } from './kanban-parts'

const STAGE_INDEX: Record<string, number> = {}
for (let i = 0; i < STAGES.length; i++) {
  const stage = STAGES[i]
  if (stage) {
    STAGE_INDEX[stage] = i
  }
}

function isAdjacentMove(from: string, to: string): 'advance' | 'revert' | null {
  const fromIdx = STAGE_INDEX[from]
  const toIdx = STAGE_INDEX[to]
  if (fromIdx === undefined || toIdx === undefined) return null
  if (toIdx === fromIdx + 1) return 'advance'
  if (toIdx === fromIdx - 1) return 'revert'
  return null
}

export function ProposalKanban() {
  const [boardType, setBoardType] = useState<BoardType>('NEW_INSURANCE')
  const [search, setSearch] = useState('')
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(
    null
  )

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isError, refetch } = useKanbanProposals({
    boardType,
    search: debouncedSearch || undefined,
  })

  const advanceMutation = useAdvanceProposal()
  const revertMutation = useRevertProposal()

  const grouped = useMemo(() => groupByStage(data ?? []), [data])

  const [localGrouped, setLocalGrouped] = useState<Record<
    ProposalStage,
    ProposalData[]
  > | null>(null)

  const displayGrouped = localGrouped ?? grouped

  const handleDragOver = useCallback(
    (
      event: Parameters<
        NonNullable<React.ComponentProps<typeof DragDropProvider>['onDragOver']>
      >[0]
    ) => {
      const { source, target } = event.operation

      if (!source || !target) return
      if (source.type === 'column') return

      setLocalGrouped((prev) => {
        const current = prev ?? grouped
        return move(current, event) as Record<ProposalStage, ProposalData[]>
      })
    },
    [grouped]
  )

  const handleDragEnd = useCallback(
    (
      event: Parameters<
        NonNullable<React.ComponentProps<typeof DragDropProvider>['onDragEnd']>
      >[0]
    ) => {
      const { source, target } = event.operation

      if (event.canceled || !source || !target) {
        setLocalGrouped(null)
        return
      }

      if (source.type === 'column') return

      const sourceGroup = source.data?.group as string | undefined
      const targetGroup = target.data?.group as string | undefined
      const targetId =
        typeof target.id === 'string' ? target.id : String(target.id)

      const fromStage = sourceGroup
      const toStage = targetGroup ?? targetId

      if (!fromStage || !toStage || fromStage === toStage) {
        setLocalGrouped(null)
        return
      }

      const direction = isAdjacentMove(fromStage, toStage)

      if (!direction) {
        toast.error('Só é possível mover para estágios adjacentes.')
        setLocalGrouped(null)
        return
      }

      const proposalId = String(source.id)

      if (direction === 'advance') {
        advanceMutation.mutate(proposalId, {
          onError: () => setLocalGrouped(null),
          onSuccess: () => setLocalGrouped(null),
        })
      } else {
        revertMutation.mutate(proposalId, {
          onError: () => setLocalGrouped(null),
          onSuccess: () => setLocalGrouped(null),
        })
      }
    },
    [grouped, advanceMutation, revertMutation]
  )

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar propostas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <KanbanToolbar
        search={search}
        onSearchChange={setSearch}
        boardType={boardType}
        onBoardTypeChange={setBoardType}
      />

      {isLoading ? (
        <KanbanSkeleton />
      ) : (
        <DragDropProvider onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div
            className="flex gap-3 overflow-x-auto pb-4"
            style={{ minHeight: '60vh' }}
          >
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                proposals={displayGrouped[stage] ?? []}
                onCardClick={setSelectedProposal}
              />
            ))}
          </div>
        </DragDropProvider>
      )}

      <KanbanCardDetail
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
      />
    </div>
  )
}
