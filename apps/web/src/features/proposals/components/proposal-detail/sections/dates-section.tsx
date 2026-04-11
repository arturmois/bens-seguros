'use client'

import { formatDate } from '@/lib/formatters'

import type { ProposalData } from '../../../lib/constants'
import { InfoItem } from '../../proposal-detail-helpers'

interface DatesSectionProps {
  readonly proposal: ProposalData
}

export function DatesSection({ proposal }: DatesSectionProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Datas</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoItem
          label="Vigência Início"
          value={
            proposal.coverageStartDate
              ? formatDate(proposal.coverageStartDate)
              : '—'
          }
        />
        <InfoItem
          label="Vigência Fim"
          value={
            proposal.coverageEndDate
              ? formatDate(proposal.coverageEndDate)
              : '—'
          }
        />
        <InfoItem
          label="Validade da Cotação"
          value={
            proposal.quoteValidUntil
              ? formatDate(proposal.quoteValidUntil)
              : '—'
          }
        />
        <InfoItem
          label="Enviada em"
          value={
            proposal.sentToClientAt ? formatDate(proposal.sentToClientAt) : '—'
          }
        />
        <InfoItem
          label="Resposta do Cliente"
          value={
            proposal.clientResponseAt
              ? formatDate(proposal.clientResponseAt)
              : '—'
          }
        />
      </div>
    </div>
  )
}
