'use client'

import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

import type { ProposalData } from '../lib/constants'
import { BRANCH_LABELS } from '../lib/constants'

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
  onClick: () => void
}

export function KanbanCard({ proposal, onClick }: KanbanCardProps) {
  const isEndorsement = proposal.boardType === 'ENDORSEMENT'
  return (
    <div
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
        'bg-card shadow-xs cursor-pointer rounded-lg border p-3 transition-shadow hover:shadow-sm'
      )}
    >
      <div className="min-w-0 space-y-2">
        {isEndorsement ? (
          <>
            <p className="truncate text-sm font-medium">
              {proposal.sourcePolicySnapshot?.clientName ??
                proposal.clientName ??
                'Cliente'}
            </p>
            <p className="text-muted-foreground text-xs">
              Apólice {proposal.sourcePolicySnapshot?.policyNumber ?? '—'}
            </p>
            <p className="text-muted-foreground text-xs">
              {proposal.endorsementType ?? 'Endosso'}
            </p>
          </>
        ) : (
          <p className="truncate text-sm font-medium">
            {proposal.clientName ?? 'Cliente'}
          </p>
        )}
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
            <span
              className="text-muted-foreground max-w-[100px] truncate text-xs"
              title={proposal.salespersonName}
            >
              {proposal.salespersonName}
            </span>
          )}
        </div>
        {proposal.coverageStartDate && (
          <span className="text-muted-foreground text-xs">
            Vigência: {formatDate(proposal.coverageStartDate)}
          </span>
        )}
      </div>
    </div>
  )
}
