'use client'

import { useState } from 'react'

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { api, ApiError } from '@/lib/api-client'

import { groupByStage, useKanbanProposals } from '../hooks/use-kanban-proposals'
import type { BoardType, ProposalData, ProposalStage } from '../types'
import { STAGES } from '../types'
import { KanbanCard } from './kanban-card'
import { KanbanCardDetail } from './kanban-card-detail'
import { KanbanColumn } from './kanban-column'
import { KanbanSkeleton, KanbanToolbar } from './kanban-parts'
import { LostReasonDialog } from './lost-reason-dialog'

const ADVANCE_TARGETS = new Set<ProposalStage>([
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
  'POLICY_ISSUED',
])

function findProposalById(
  proposals: ProposalData[],
  id: string
): ProposalData | undefined {
  return proposals.find((p) => p.id === id)
}

function isNextStage(from: ProposalStage, to: ProposalStage): boolean {
  const fromIndex = STAGES.indexOf(from)
  const toIndex = STAGES.indexOf(to)
  return toIndex === fromIndex + 1 && to !== 'LOST'
}

function isProposalStage(value: string): value is ProposalStage {
  return (STAGES as readonly string[]).includes(value)
}

export function ProposalKanban() {
  const [boardType, setBoardType] = useState<BoardType>('NEW_INSURANCE')
  const [search, setSearch] = useState('')
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(
    null
  )
  const [activeProposal, setActiveProposal] = useState<ProposalData | null>(
    null
  )
  const [lostProposalId, setLostProposalId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const queryClient = useQueryClient()

  const queryOptions = { boardType, search: debouncedSearch || undefined }
  const { data, isLoading, isError, refetch } = useKanbanProposals(queryOptions)

  const grouped = groupByStage(data ?? [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const proposal = findProposalById(data ?? [], String(event.active.id))
    setActiveProposal(proposal ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveProposal(null)

    const { active, over } = event
    if (!over) return

    const proposalId = String(active.id)
    const rawTarget = String(over.data?.current?.stage ?? over.id)
    if (!isProposalStage(rawTarget)) return
    const targetStage = rawTarget

    const proposal = findProposalById(data ?? [], proposalId)
    if (!proposal) return

    const sourceStage = proposal.stage

    if (sourceStage === targetStage) return

    if (targetStage === 'LOST') {
      setLostProposalId(proposalId)
      return
    }

    if (!ADVANCE_TARGETS.has(targetStage)) return
    if (!isNextStage(sourceStage, targetStage)) return

    const queryKey = ['proposals', 'kanban', queryOptions]

    const previousData = queryClient.getQueryData<ProposalData[]>(queryKey)

    queryClient.setQueryData<ProposalData[]>(queryKey, (old) => {
      if (!old) return old
      return old.map((p) =>
        p.id === proposalId ? { ...p, stage: targetStage } : p
      )
    })

    void api
      .post<ProposalData>(`/api/v1/proposals/${proposalId}/advance`, {})
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['proposals'] })
      })
      .catch((error: unknown) => {
        queryClient.setQueryData(queryKey, previousData)
        const message =
          error instanceof ApiError ? error.message : 'Erro ao mover proposta'
        toast.error(message)
      })
  }

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex gap-3 overflow-x-auto pb-4"
            style={{ minHeight: '60vh' }}
          >
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                proposals={grouped[stage] ?? []}
                onCardClick={setSelectedProposal}
              />
            ))}
          </div>

          <DragOverlay>
            {activeProposal ? (
              <div className="rotate-2 opacity-90">
                <KanbanCard proposal={activeProposal} onClick={() => null} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <KanbanCardDetail
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
      />

      <LostReasonDialog
        proposalId={lostProposalId}
        onClose={() => setLostProposalId(null)}
      />
    </div>
  )
}
