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

import { useDebounce } from '@/hooks/use-debounce'
import { api, ApiError } from '@/lib/api-client'

import type { KanbanFilters } from '../hooks/use-kanban-proposals'
import type { BoardType, ProposalData, ProposalStage } from '../lib/constants'
import { ENDORSEMENT_STAGES, STAGES } from '../lib/constants'
import { IssuePolicySheet } from './issue-policy-sheet'
import { KanbanCard } from './kanban-card'
import { KanbanCardDetail } from './kanban-card-detail'
import { KanbanColumn } from './kanban-column'
import { KanbanToolbar } from './kanban-parts'
import { LostReasonDialog } from './lost-reason-dialog'

const ADVANCE_TARGETS = new Set<ProposalStage>([
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
  'POLICY_ISSUED',
])

interface OptimisticMove {
  proposalId: string
  sourceStage: ProposalStage
  targetStage: ProposalStage
  proposal: ProposalData
}

interface ProposalKanbanProps {
  initialBoardType?: BoardType
  allowedBoardTypes?: readonly BoardType[]
  searchPlaceholder?: string
}

function isNextStage(
  from: ProposalStage,
  to: ProposalStage,
  stages: readonly ProposalStage[]
): boolean {
  const fromIndex = stages.indexOf(from)
  const toIndex = stages.indexOf(to)
  return toIndex === fromIndex + 1 && to !== 'LOST'
}

function isProposalStage(value: string): value is ProposalStage {
  return (STAGES as readonly string[]).includes(value)
}

function findProposalInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  proposalId: string,
  filters: KanbanFilters,
  stages: readonly ProposalStage[]
): { proposal: ProposalData; stage: ProposalStage } | undefined {
  for (const stage of stages) {
    const queryKey = ['proposals', 'kanban', stage, filters]
    const cached = queryClient.getQueryData<{
      pages: Array<{ data: ProposalData[] }>
    }>(queryKey)
    if (!cached) continue

    const found = cached.pages
      .flatMap((p) => p.data)
      .find((p) => p.id === proposalId)

    if (found) return { proposal: found, stage }
  }
  return undefined
}

export function ProposalKanban({
  initialBoardType = 'NEW_INSURANCE',
  allowedBoardTypes = ['NEW_INSURANCE', 'RENEWAL'] as const,
  searchPlaceholder,
}: ProposalKanbanProps) {
  const [boardType, setBoardType] = useState<BoardType>(initialBoardType)
  const [search, setSearch] = useState('')
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(
    null
  )
  const [activeProposal, setActiveProposal] = useState<ProposalData | null>(
    null
  )
  const [lostProposalId, setLostProposalId] = useState<string | null>(null)
  const [optimisticMove, setOptimisticMove] = useState<OptimisticMove | null>(
    null
  )
  const [issuePolicyProposalId, setIssuePolicyProposalId] = useState<
    string | null
  >(null)

  const debouncedSearch = useDebounce(search, 300)
  const queryClient = useQueryClient()

  const visibleStages =
    boardType === 'ENDORSEMENT' ? ENDORSEMENT_STAGES : STAGES

  const filters: KanbanFilters = {
    boardType,
    search: debouncedSearch || undefined,
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const result = findProposalInCache(
      queryClient,
      String(event.active.id),
      filters,
      visibleStages
    )
    setActiveProposal(result?.proposal ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) {
      setActiveProposal(null)
      return
    }

    const proposalId = String(active.id)
    const rawTarget = String(over.data?.current?.stage ?? over.id)

    if (!isProposalStage(rawTarget)) {
      setActiveProposal(null)
      return
    }

    const targetStage = rawTarget
    const found = findProposalInCache(
      queryClient,
      proposalId,
      filters,
      visibleStages
    )

    setActiveProposal(null)

    if (!found || found.stage === targetStage) return

    const { proposal, stage: sourceStage } = found

    if (sourceStage === 'POLICY_ISSUED') return

    if (targetStage === 'LOST') {
      setLostProposalId(proposalId)
      return
    }

    if (!ADVANCE_TARGETS.has(targetStage)) return
    if (!isNextStage(sourceStage, targetStage, visibleStages)) return

    const movedProposal: ProposalData = { ...proposal, stage: targetStage }
    setOptimisticMove({
      proposalId,
      sourceStage,
      targetStage,
      proposal: movedProposal,
    })

    void api
      .post<ProposalData>(`/api/v1/proposals/${proposalId}/advance`, {})
      .then(() => {
        setOptimisticMove(null)
        void queryClient.invalidateQueries({
          queryKey: ['proposals', 'kanban'],
        })
        if (targetStage === 'POLICY_ISSUED') {
          setIssuePolicyProposalId(proposalId)
        }
      })
      .catch((error: unknown) => {
        setOptimisticMove(null)
        const message =
          error instanceof ApiError ? error.message : 'Erro ao mover proposta'
        toast.error(message)
      })
  }

  function buildOptimisticProposals(
    stage: ProposalStage
  ): ProposalData[] | undefined {
    if (!optimisticMove) return undefined

    const queryKey = ['proposals', 'kanban', stage, filters]
    const cached = queryClient.getQueryData<{
      pages: Array<{ data: ProposalData[] }>
    }>(queryKey)
    const fetched = cached?.pages.flatMap((p) => p.data) ?? []

    if (stage === optimisticMove.sourceStage) {
      return fetched.filter((p) => p.id !== optimisticMove.proposalId)
    }

    if (stage === optimisticMove.targetStage) {
      return [optimisticMove.proposal, ...fetched]
    }

    return undefined
  }

  return (
    <div className="space-y-4">
      <KanbanToolbar
        search={search}
        onSearchChange={setSearch}
        boardType={boardType}
        onBoardTypeChange={setBoardType}
        allowedBoardTypes={allowedBoardTypes}
        searchPlaceholder={searchPlaceholder}
      />

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
          {visibleStages.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              filters={filters}
              optimisticProposals={buildOptimisticProposals(stage)}
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

      <KanbanCardDetail
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
      />

      <LostReasonDialog
        proposalId={lostProposalId}
        onClose={() => setLostProposalId(null)}
      />

      {issuePolicyProposalId && (
        <IssuePolicySheet
          proposalId={issuePolicyProposalId}
          open
          onOpenChange={(open) => {
            if (!open) setIssuePolicyProposalId(null)
          }}
        />
      )}
    </div>
  )
}
