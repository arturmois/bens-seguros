'use client'

import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/formatters'

import type { ProposalData } from '../lib/constants'
import {
  BOARD_TYPE_LABELS,
  BRANCH_LABELS,
  STAGE_BADGE_VARIANT,
  STAGE_LABELS,
} from '../lib/constants'
import { ProposalActionButtons } from './proposal-action-buttons'

interface ProposalTableRowProps {
  readonly proposal: ProposalData
  readonly isAdvancing: boolean
  readonly onRowClick: (id: string) => void
  readonly onAdvance: (id: string) => void
  readonly onLost: (id: string) => void
}

export function ProposalTableRow({
  proposal,
  isAdvancing,
  onRowClick,
  onAdvance,
  onLost,
}: ProposalTableRowProps) {
  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      onClick={() => onRowClick(proposal.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onRowClick(proposal.id)
        }
      }}
    >
      <TableCell className="font-medium">
        {proposal.clientName ?? proposal.clientId}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline">{BRANCH_LABELS[proposal.branch]}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={STAGE_BADGE_VARIANT[proposal.stage]}>
          {STAGE_LABELS[proposal.stage]}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {BOARD_TYPE_LABELS[proposal.boardType]}
      </TableCell>
      <TableCell className="hidden text-right md:table-cell">
        {formatCurrency(proposal.premiumValueInCents)}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {formatDate(proposal.createdAt)}
      </TableCell>
      <TableCell className="text-right">
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
      </TableCell>
    </TableRow>
  )
}
