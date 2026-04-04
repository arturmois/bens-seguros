'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/formatters'
import { usePolicyByProposal } from '@/features/policies/hooks/use-policies'

import { useChecklist } from '../hooks/use-checklist'
import { useAdvanceProposal } from '../hooks/use-proposals'
import type { ProposalData } from '../lib/constants'
import {
  BOARD_TYPE_LABELS,
  BRANCH_LABELS,
  STAGE_BADGE_VARIANT,
  STAGE_LABELS,
} from '../lib/constants'
import { IssuePolicyCard } from './issue-policy-card'
import { ProposalChecklistPanel } from './proposal-checklist-panel'
import { ProposalStageActions } from './proposal-stage-actions'

interface KanbanCardDetailProps {
  proposal: ProposalData | null
  onClose: () => void
}

export function KanbanCardDetail({ proposal, onClose }: KanbanCardDetailProps) {
  if (!proposal) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{proposal.clientName ?? 'Proposta'}</DialogTitle>
          <DialogDescription>
            {BOARD_TYPE_LABELS[proposal.boardType]} &middot;{' '}
            {BRANCH_LABELS[proposal.branch]}
          </DialogDescription>
        </DialogHeader>

        <KanbanCardDetailBody proposal={proposal} />

        <DialogFooter>
          <Button variant="outline" asChild>
            <Link href={`/proposals/${proposal.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver detalhes
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function KanbanCardDetailBody({ proposal }: { proposal: ProposalData }) {
  const { data: checklistData } = useChecklist(proposal.id)
  const advanceMutation = useAdvanceProposal()

  const isTerminalStage =
    proposal.stage === 'POLICY_ISSUED' || proposal.stage === 'LOST'
  const canAdvance = !isTerminalStage
  const checklistBlocking =
    !isTerminalStage &&
    proposal.stage !== 'CAPTURE' &&
    checklistData?.summary.canAdvance === false

  return (
    <div className="space-y-4 px-6">
      <div className="grid grid-cols-2 gap-3">
        <DetailItem label="Estágio">
          <Badge variant={STAGE_BADGE_VARIANT[proposal.stage]}>
            {STAGE_LABELS[proposal.stage]}
          </Badge>
        </DetailItem>
        <DetailItem label="Prêmio">
          <span className="font-medium tabular-nums">
            {formatCurrency(proposal.premiumValueInCents)}
          </span>
        </DetailItem>
        <DetailItem label="Ramo">
          <Badge variant="outline">{BRANCH_LABELS[proposal.branch]}</Badge>
        </DetailItem>
        {proposal.salespersonName && (
          <DetailItem label="Vendedor">
            <span className="text-sm">{proposal.salespersonName}</span>
          </DetailItem>
        )}
      </div>

      {proposal.boardType === 'ENDORSEMENT' &&
        proposal.sourcePolicySnapshot && (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Apólice de origem
            </p>
            <DetailItem label="Número">
              <span>{proposal.sourcePolicySnapshot.policyNumber}</span>
            </DetailItem>
            <DetailItem label="Segurado">
              <span>{proposal.sourcePolicySnapshot.clientName}</span>
            </DetailItem>
            <DetailItem label="Motivo">
              <span>{proposal.endorsementReason ?? '—'}</span>
            </DetailItem>
            {proposal.sourcePolicyId && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/policies/${proposal.sourcePolicyId}`}>
                  Ver apólice
                </Link>
              </Button>
            )}
          </div>
        )}

      <ProposalStageActions
        canAdvance={canAdvance}
        canMarkLost={false}
        checklistBlocking={checklistBlocking}
        advancePending={advanceMutation.isPending}
        onAdvance={() => advanceMutation.mutate(proposal.id)}
        onMarkLost={() => {}}
      />

      {proposal.stage === 'POLICY_ISSUED' && (
        <IssuePolicySection proposalId={proposal.id} />
      )}

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Checklist
        </p>
        <ProposalChecklistPanel proposalId={proposal.id} />
      </div>
    </div>
  )
}

function IssuePolicySection({ proposalId }: { proposalId: string }) {
  const { data: existingPolicy } = usePolicyByProposal(proposalId)
  return (
    <IssuePolicyCard proposalId={proposalId} policyId={existingPolicy?.id} />
  )
}

function DetailItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div>{children}</div>
    </div>
  )
}
