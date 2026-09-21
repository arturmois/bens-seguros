'use client'

import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/formatters'

import {
  BOARD_TYPE_LABELS,
  BRANCH_LABELS,
  STAGE_BADGE_VARIANT,
  STAGE_LABELS,
  type ProposalData,
} from '../lib/constants'
import { ProposalActionButtons } from './proposal-action-buttons'

interface ProposalCardProps {
  readonly proposal: ProposalData
  readonly isAdvancing: boolean
  readonly onAdvance: (id: string) => void
  readonly onLost: (id: string) => void
}

export function ProposalCard({
  proposal,
  isAdvancing,
  onAdvance,
  onLost,
}: ProposalCardProps) {
  const router = useRouter()
  const goToDetail = () => router.push(`/proposals/${proposal.id}`)
  return (
    <div
      className="cursor-pointer space-y-3 rounded-lg border bg-card p-4 active:bg-muted/50"
      onClick={goToDetail}
      role="button"
      tabIndex={0}
      aria-label={`Abrir proposta de ${proposal.clientName ?? proposal.contactId}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          goToDetail()
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {proposal.clientName ?? proposal.contactId}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge variant="outline">{BRANCH_LABELS[proposal.branch]}</Badge>
            <Badge variant={STAGE_BADGE_VARIANT[proposal.stage]}>
              {STAGE_LABELS[proposal.stage]}
            </Badge>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Tipo</div>
          <div>{BOARD_TYPE_LABELS[proposal.boardType]}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Valor</div>
          <div>{formatCurrency(proposal.premiumValueInCents)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Criado em</div>
          <div>{formatDate(proposal.createdAt)}</div>
        </div>
      </div>
      <div
        className="flex justify-end gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <ProposalActionButtons
          stage={proposal.stage}
          onAdvance={() => onAdvance(proposal.id)}
          onLost={() => onLost(proposal.id)}
          isAdvancing={isAdvancing}
        />
      </div>
    </div>
  )
}
