'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { ProposalData, ProposalStage } from '../types'
import { STAGE_LABELS } from '../types'
import { KanbanCardDraggable } from './kanban-card-draggable'

const STAGE_COLORS: Record<ProposalStage, string> = {
  CAPTURE: 'bg-blue-500',
  QUOTE: 'bg-amber-500',
  PROTOCOL: 'bg-orange-500',
  INSPECTION: 'bg-purple-500',
  PAYMENT: 'bg-emerald-500',
  POLICY_ISSUED: 'bg-green-500',
  LOST: 'bg-red-500',
}

interface KanbanColumnProps {
  stage: ProposalStage
  proposals: ProposalData[]
  onCardClick: (proposal: ProposalData) => void
}

export function KanbanColumn({
  stage,
  proposals,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const itemIds = proposals.map((p) => p.id)

  return (
    <div className="bg-muted/30 flex h-full w-[280px] shrink-0 flex-col rounded-xl border">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span
          className={cn(
            'h-2.5 w-2.5 shrink-0 rounded-full',
            STAGE_COLORS[stage]
          )}
          aria-hidden="true"
        />
        <span className="truncate text-sm font-medium">
          {STAGE_LABELS[stage]}
        </span>
        <Badge variant="secondary" size="sm" className="ml-auto tabular-nums">
          {proposals.length}
        </Badge>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 space-y-2 overflow-y-auto p-2 transition-colors',
            isOver && 'bg-primary/5 ring-primary/20 ring-2 ring-inset'
          )}
        >
          {proposals.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-xs">
              Nenhuma proposta
            </p>
          )}
          {proposals.map((proposal) => (
            <KanbanCardDraggable
              key={proposal.id}
              proposal={proposal}
              onClick={() => onCardClick(proposal)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
