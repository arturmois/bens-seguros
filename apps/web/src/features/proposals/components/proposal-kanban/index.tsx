'use client'

import { useState } from 'react'

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'

import { useDebounce } from '@/hooks/use-debounce'

import { useProposalsFilters } from '../../hooks/use-proposals-filters'
import type { KanbanFilters } from '../../hooks/use-kanban-proposals'
import type {
  BoardType,
  ProposalData,
  ProposalStage,
} from '../../lib/constants'
import { ENDORSEMENT_STAGES, KANBAN_STAGES, STAGES } from '../../lib/constants'
import { IssuePolicyDialog } from '../issue-policy-dialog'
import { KanbanCard } from '../kanban-card'
import { KanbanCardDetail } from '../kanban-card-detail'
import { KanbanColumn } from '../kanban-column'
import { LostReasonDialog } from '../lost-reason-dialog'
import { getNextStage } from './kanban-utils'
import { useKanbanDnd } from './use-kanban-dnd'

interface ProposalKanbanProps {
  readonly allowedBoardTypes?: readonly BoardType[]
  /** Forces a board type regardless of URL state. Used by /endorsements. */
  readonly boardTypeOverride?: BoardType
}

function isProposalStage(value: string): value is ProposalStage {
  return (STAGES as readonly string[]).includes(value)
}

export function ProposalKanban({
  allowedBoardTypes = ['NEW_INSURANCE', 'RENEWAL'] as const,
  boardTypeOverride,
}: ProposalKanbanProps) {
  const filters = useProposalsFilters()

  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(
    null
  )
  const [lostProposalId, setLostProposalId] = useState<string | null>(null)
  const [issuePolicyProposalId, setIssuePolicyProposalId] = useState<
    string | null
  >(null)

  const debouncedSearch = useDebounce(filters.apiParams.search, 300)
  const queryClient = useQueryClient()

  const effectiveBoardType: BoardType =
    boardTypeOverride ?? allowedBoardTypes[0] ?? 'NEW_INSURANCE'

  const baseStages =
    effectiveBoardType === 'ENDORSEMENT' ? ENDORSEMENT_STAGES : KANBAN_STAGES

  const stageInRaw = filters.values.stageIn
  const stageInTyped: readonly ProposalStage[] | undefined = Array.isArray(
    stageInRaw
  )
    ? stageInRaw.filter(isProposalStage)
    : undefined

  const visibleStages: readonly ProposalStage[] = stageInTyped?.length
    ? baseStages.filter((s) => stageInTyped.includes(s))
    : baseStages

  const kanbanFilters: KanbanFilters = {
    boardType: effectiveBoardType,
    search: debouncedSearch || undefined,
    branchIn: filters.apiParams.branchIn,
    salespersonIdIn: filters.apiParams.salespersonIdIn,
    createdFrom: filters.apiParams.createdFrom,
    createdTo: filters.apiParams.createdTo,
    updatedAtFrom: filters.apiParams.updatedAtFrom,
    updatedAtTo: filters.apiParams.updatedAtTo,
  }

  const {
    activeProposal,
    handleDragStart,
    handleDragEnd,
    buildOptimisticProposals,
  } = useKanbanDnd({
    filters: kanbanFilters,
    visibleStages,
    onPolicyIssue: setIssuePolicyProposalId,
    onLostDrop: setLostProposalId,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  return (
    <div className="space-y-4">
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
              filters={kanbanFilters}
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
        onAdvanceSuccess={(proposalId) => {
          const nextStage = selectedProposal
            ? getNextStage(selectedProposal.stage, STAGES)
            : null
          setSelectedProposal(null)
          void queryClient.invalidateQueries({
            queryKey: ['proposals', 'kanban'],
          })
          if (nextStage === 'POLICY_ISSUED') {
            setIssuePolicyProposalId(proposalId)
          }
        }}
      />

      <LostReasonDialog
        proposalId={lostProposalId}
        onClose={() => setLostProposalId(null)}
      />

      {issuePolicyProposalId && (
        <IssuePolicyDialog
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
