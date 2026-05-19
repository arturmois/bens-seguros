'use client'

import { formatDate } from '@/lib/formatters'

import type { ProposalData } from '../../../lib/constants'
import { ContactCard } from '../cards/contact-card'
import { DatesCard } from '../cards/dates-card'
import { InlineEditObservations } from '../inline-edit/inline-edit-observations'

interface OverviewTabProps {
  readonly proposal: ProposalData
  readonly conditionalsSlot?: React.ReactNode
}

export function OverviewTab({ proposal, conditionalsSlot }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {conditionalsSlot}
      <div className="grid gap-4 md:grid-cols-2">
        <ContactCard proposal={proposal} />
        <DatesCard proposal={proposal} />
      </div>
      <InlineEditObservations
        proposalId={proposal.id}
        initialValue={proposal.observations}
      />
      <div className="text-muted-foreground border-t border-dashed pt-3 text-xs">
        <span>
          Criada em{' '}
          <strong className="text-foreground">
            {formatDate(proposal.createdAt)}
          </strong>
        </span>
        <span className="mx-3">·</span>
        <span>
          Última atualização{' '}
          <strong className="text-foreground">
            {formatDate(proposal.updatedAt)}
          </strong>
        </span>
      </div>
    </div>
  )
}
