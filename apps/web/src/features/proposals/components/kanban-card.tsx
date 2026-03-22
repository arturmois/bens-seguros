'use client'

import { useSortable } from '@dnd-kit/react/sortable'
import { GripVertical } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

import type { ProposalData, ProposalStage } from '../types'
import { BRANCH_LABELS } from '../types'

const TERMINAL_STAGES: ReadonlySet<ProposalStage> = new Set([
  'POLICY_ISSUED',
  'LOST',
])

const BRANCH_COLORS: Record<string, string> = {
  AUTO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  RESIDENTIAL:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  CONDOMINIUM:
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  BUSINESS:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  LIFE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
}

interface KanbanCardProps {
  proposal: ProposalData
  index: number
  column: string
  onClick: () => void
}

export function KanbanCard({
  proposal,
  index,
  column,
  onClick,
}: KanbanCardProps) {
  const isTerminal = TERMINAL_STAGES.has(proposal.stage)

  const { ref, isDragging } = useSortable({
    id: proposal.id,
    index,
    group: column,
    type: 'card',
    accept: 'card',
    disabled: isTerminal,
  })

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'bg-card shadow-xs cursor-pointer rounded-lg border p-3 transition-shadow hover:shadow-sm',
        isDragging && 'opacity-50 shadow-md',
        isTerminal && 'cursor-default opacity-70'
      )}
    >
      <div className="flex items-start gap-2">
        {!isTerminal && (
          <GripVertical className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate text-sm font-medium">
            {proposal.clientName ?? 'Cliente'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              size="sm"
              className={cn('border-0', BRANCH_COLORS[proposal.branch])}
            >
              {BRANCH_LABELS[proposal.branch]}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {formatCurrency(proposal.premiumValueInCents)}
            </span>
            {proposal.salespersonName && (
              <span className="text-muted-foreground max-w-[80px] truncate text-xs">
                {proposal.salespersonName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
