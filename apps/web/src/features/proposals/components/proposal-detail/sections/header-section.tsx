'use client'

import { FileText, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import {
  BOARD_TYPE_LABELS,
  BRANCH_LABELS,
  STAGE_BADGE_VARIANT,
  STAGE_LABELS,
} from '../../../lib/constants'
import type { ProposalData } from '../../../lib/constants'
import { SendQuoteDialog } from '../../send-quote-dialog'

interface HeaderSectionProps {
  readonly proposalId: string
  readonly proposal: ProposalData
  readonly pdfPending: boolean
  readonly sendQuotePending: boolean
  readonly onGeneratePdf: () => void
  readonly onSendQuote: () => void
}

export function HeaderSection({
  proposalId,
  proposal,
  pdfPending,
  sendQuotePending,
  onGeneratePdf,
  onSendQuote,
}: HeaderSectionProps) {
  const showActions = proposal.stage !== 'CAPTURE' && proposal.stage !== 'LOST'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge
        variant={STAGE_BADGE_VARIANT[proposal.stage]}
        className="px-3 py-1 text-sm"
      >
        {STAGE_LABELS[proposal.stage]}
      </Badge>
      <Badge variant="outline">{BRANCH_LABELS[proposal.branch]}</Badge>
      <Badge variant="secondary">{BOARD_TYPE_LABELS[proposal.boardType]}</Badge>
      {showActions && (
        <Button variant="outline" onClick={onGeneratePdf} disabled={pdfPending}>
          {pdfPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <FileText className="mr-2 size-4" />
          )}
          Gerar PDF
        </Button>
      )}
      {showActions && (
        <SendQuoteDialog
          proposalId={proposalId}
          clientName={proposal.clientName ?? 'Cliente'}
          premiumValueInCents={proposal.premiumValueInCents}
          coverageStartDate={proposal.coverageStartDate}
          sentToClientAt={proposal.sentToClientAt}
          disabled={sendQuotePending}
          onSend={onSendQuote}
          isPending={sendQuotePending}
        />
      )}
    </div>
  )
}
