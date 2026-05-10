'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { ProposalData } from '../lib/constants'
import { KanbanCard } from './kanban-card'

interface KanbanCardDraggableProps {
  proposal: ProposalData
  onClick: () => void
}

export function KanbanCardDraggable({
  proposal,
  onClick,
}: KanbanCardDraggableProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: proposal.id, data: { stage: proposal.stage } })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard proposal={proposal} onClick={onClick} />
    </div>
  )
}
