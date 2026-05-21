'use client'

import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

import type { ProposalData } from '../lib/constants'
import { BRANCH_LABELS } from '../lib/constants'

const BRANCH_COLORS: Record<string, string> = {
  AUTO: 'bg-info/10 text-info',
  RESIDENTIAL: 'bg-success/10 text-success',
  CONDOMINIUM:
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' /* INTENCIONAL — cor categorial por ramo */,
  BUSINESS: 'bg-warning/10 text-warning',
  LIFE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' /* INTENCIONAL — cor categorial por ramo */,
  OTHER:
    'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' /* INTENCIONAL — cor categorial por ramo */,
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
