'use client'

import { useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'

import { DocumentList } from '@/features/documents/components/document-list'
import { DocumentUpload } from '@/features/documents/components/document-upload'
import { usePolicyByProposal } from '@/features/policies/hooks/use-policies'

import { useChecklist } from '../hooks/use-checklist'
import { ProposalStageActions } from './proposal-stage-actions'
import {
  useAdvanceProposal,
  useProposal,
  useRevertProposal,
} from '../hooks/use-proposals'
import {
  BOARD_TYPE_LABELS,
  BRANCH_LABELS,
  STAGE_BADGE_VARIANT,
  STAGE_LABELS,
} from '../types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { InsuredObjectSection } from './insured-object-section'
import { IssuePolicyCard } from './issue-policy-card'
import { LostReasonDialog } from './lost-reason-dialog'
import { DetailSkeleton, InfoItem } from './proposal-detail-helpers'
import { ProposalChecklistPanel } from './proposal-checklist-panel'

interface ProposalDetailProps {
  proposalId: string
}

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const router = useRouter()
  const { data, isLoading, isError } = useProposal(proposalId)
  const { data: existingPolicy } = usePolicyByProposal(proposalId)
  const { data: checklistData } = useChecklist(proposalId)
  const advanceMutation = useAdvanceProposal()
  const revertMutation = useRevertProposal()
  const [showLostDialog, setShowLostDialog] = useState(false)

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar proposta.</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/proposals')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  const proposal = data.data
  const isTerminalStage =
    proposal.stage === 'POLICY_ISSUED' || proposal.stage === 'LOST'
  const canAdvance = !isTerminalStage
  const checklistBlocking =
    !isTerminalStage &&
    proposal.stage !== 'CAPTURE' &&
    checklistData?.summary.canAdvance === false
  const canRevert =
    proposal.stage !== 'CAPTURE' &&
    proposal.stage !== 'LOST' &&
    proposal.stage !== 'POLICY_ISSUED'
  const canMarkLost =
    proposal.stage !== 'LOST' && proposal.stage !== 'POLICY_ISSUED'

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/proposals')}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Propostas
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">
          {proposal.clientName
            ? `${BRANCH_LABELS[proposal.branch]} — ${proposal.clientName}`
            : `Proposta`}
        </span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant={STAGE_BADGE_VARIANT[proposal.stage]}
          className="px-3 py-1 text-sm"
        >
          {STAGE_LABELS[proposal.stage]}
        </Badge>
        <Badge variant="outline">{BRANCH_LABELS[proposal.branch]}</Badge>
        <Badge variant="secondary">
          {BOARD_TYPE_LABELS[proposal.boardType]}
        </Badge>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoItem
          label="Cliente"
          value={proposal.clientName ?? proposal.clientId}
        />
        <InfoItem
          label="Vendedor"
          value={proposal.salespersonName ?? proposal.salespersonId}
        />
        <InfoItem
          label="Valor do Prêmio"
          value={formatCurrency(proposal.premiumValueInCents)}
        />
        <InfoItem
          label="Comissão"
          value={`${(proposal.commissionPercentageInCents / 100).toFixed(2)}%`}
        />
        <InfoItem label="Criado em" value={formatDate(proposal.createdAt)} />
        <InfoItem
          label="Atualizado em"
          value={formatDate(proposal.updatedAt)}
        />
      </div>

      {proposal.stage === 'LOST' && proposal.lostReason && (
        <>
          <Separator />
          <div className="bg-destructive/10 rounded-md p-4">
            <p className="text-destructive text-sm font-medium">
              Motivo da Perda
            </p>
            <p className="mt-1 text-sm">{proposal.lostReason}</p>
          </div>
        </>
      )}

      <InsuredObjectSection proposal={proposal} />

      <Separator />

      <ProposalStageActions
        canAdvance={canAdvance}
        canRevert={canRevert}
        canMarkLost={canMarkLost}
        checklistBlocking={checklistBlocking}
        advancePending={advanceMutation.isPending}
        revertPending={revertMutation.isPending}
        onAdvance={() => advanceMutation.mutate(proposalId)}
        onRevert={() => revertMutation.mutate(proposalId)}
        onMarkLost={() => setShowLostDialog(true)}
      />

      {proposal.stage === 'POLICY_ISSUED' && (
        <IssuePolicyCard
          proposalId={proposalId}
          policyId={existingPolicy?.id}
        />
      )}

      <Separator />

      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTab value="checklist">Checklist</TabsTab>
          <TabsTab value="documents">Documentos</TabsTab>
        </TabsList>

        <TabsContent value="checklist" className="mt-4">
          <ProposalChecklistPanel proposalId={proposalId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <DocumentUpload entityType="PROPOSAL" entityId={proposalId} />
          <DocumentList entityType="PROPOSAL" entityId={proposalId} />
        </TabsContent>
      </Tabs>

      <LostReasonDialog
        proposalId={showLostDialog ? proposalId : null}
        onClose={() => setShowLostDialog(false)}
      />
    </div>
  )
}
