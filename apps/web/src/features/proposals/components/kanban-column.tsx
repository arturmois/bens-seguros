'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

import {
  type KanbanFilters,
  useKanbanProposalsByStage,
} from '../hooks/use-kanban-proposals'
import type { ProposalData, ProposalStage } from '../lib/constants'
import { STAGE_LABELS } from '../lib/constants'
import { KanbanCardDraggable } from './kanban-card-draggable'

const STAGE_COLORS: Record<ProposalStage, string> = {
  CAPTURE: 'bg-info',
  QUOTE: 'bg-warning',
  PROTOCOL: 'bg-orange-500' /* INTENCIONAL — sem token semântico equivalente */,
  INSPECTION:
    'bg-purple-500' /* INTENCIONAL — sem token semântico equivalente */,
  PAYMENT: 'bg-success',
  POLICY_ISSUED: 'bg-success',
  LOST: 'bg-destructive',
}

interface KanbanColumnProps {
  stage: ProposalStage
  filters: KanbanFilters
  optimisticProposals?: ProposalData[]
  onCardClick: (proposal: ProposalData) => void
}

export function KanbanColumn({
  stage,
  filters,
  optimisticProposals,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useKanbanProposalsByStage(stage, filters)
  const fetchedProposals = data?.pages.flatMap((page) => page.data) ?? []
  const proposals = optimisticProposals ?? fetchedProposals
  const totalPremium = proposals.reduce(
    (sum, p) => sum + (p.premiumValueInCents ?? 0),
    0
  )
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
      {proposals.length > 0 && (
        <div className="text-muted-foreground border-b px-3 py-1.5 text-xs">
          {formatCurrency(totalPremium)}
        </div>
      )}
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
          {hasNextPage && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
            </Button>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
