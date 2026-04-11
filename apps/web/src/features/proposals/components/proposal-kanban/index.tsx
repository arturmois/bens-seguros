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

import type { KanbanFilters } from '../../hooks/use-kanban-proposals'
import type { BoardType, ProposalData } from '../../lib/constants'
import { ENDORSEMENT_STAGES, KANBAN_STAGES, STAGES } from '../../lib/constants'
import { IssuePolicyDialog } from '../issue-policy-dialog'
import { KanbanCard } from '../kanban-card'
import { KanbanCardDetail } from '../kanban-card-detail'
import { KanbanColumn } from '../kanban-column'
import { KanbanToolbar } from '../kanban-parts'
import { LostReasonDialog } from '../lost-reason-dialog'
import { getNextStage } from './kanban-utils'
import { useKanbanDnd } from './use-kanban-dnd'

interface ProposalKanbanProps {
  initialBoardType?: BoardType
  allowedBoardTypes?: readonly BoardType[]
  searchPlaceholder?: string
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
  const [lostProposalId, setLostProposalId] = useState<string | null>(null)
  const [issuePolicyProposalId, setIssuePolicyProposalId] = useState<
    string | null
  >(null)

  const debouncedSearch = useDebounce(search, 300)
  const queryClient = useQueryClient()

  const visibleStages =
    boardType === 'ENDORSEMENT' ? ENDORSEMENT_STAGES : KANBAN_STAGES

  const filters: KanbanFilters = {
    boardType,
    search: debouncedSearch || undefined,
  }

  const {
    activeProposal,
    handleDragStart,
    handleDragEnd,
    buildOptimisticProposals,
  } = useKanbanDnd({
    filters,
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
