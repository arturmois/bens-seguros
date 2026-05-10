'use client'

import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import { useContact } from '@/features/contacts/hooks/use-contacts'
import { PromoteContactDialog } from '@/features/contacts/components/promote-contact-dialog'
import { usePolicyByProposal } from '@/features/policies/hooks/use-policies'
import { ApiError } from '@/lib/api-client'

import { useChecklist } from '../../hooks/use-checklist'
import { useGenerateProposalPdf } from '../../hooks/use-generate-proposal-pdf'
import { useAdvanceProposal, useProposal } from '../../hooks/use-proposals'
import { useSendQuote } from '../../hooks/use-send-quote'
import { BRANCH_LABELS } from '../../lib/constants'
import { InsuredObjectSection } from '../insured-object-section'
import { LostReasonDialog } from '../lost-reason-dialog'
import { DetailSkeleton } from '../proposal-detail-helpers'
import { ProposalStageActions } from '../proposal-stage-actions'
import { CoreInfoSection } from './sections/core-info-section'
import { DatesSection } from './sections/dates-section'
import { DocumentsTabSection } from './sections/documents-tab-section'
import { EndorsementSection } from './sections/endorsement-section'
import { HeaderSection } from './sections/header-section'

interface ProposalDetailProps {
  proposalId: string
}

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const router = useRouter()
  const { data, isLoading, isError } = useProposal(proposalId)
  const { data: existingPolicy } = usePolicyByProposal(proposalId)
  const { data: checklistData } = useChecklist(proposalId)
  const advanceMutation = useAdvanceProposal()
  const pdfMutation = useGenerateProposalPdf(proposalId)
  const sendQuoteMutation = useSendQuote(proposalId)
  const [showLostDialog, setShowLostDialog] = useState(false)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const proposalData = data?.data
  const contactId = proposalData?.contactId ?? ''
  const { data: contact } = useContact(contactId)
  if (isLoading) {
    return <DetailSkeleton />
  }
  if (isError || !proposalData) {
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
  const proposal = proposalData
  const isTerminalStage =
    proposal.stage === 'POLICY_ISSUED' || proposal.stage === 'LOST'
  const canAdvance = !isTerminalStage
  const checklistBlocking =
    !isTerminalStage &&
    proposal.stage !== 'CAPTURE' &&
    checklistData?.summary.canAdvance === false
  const canMarkLost =
    proposal.stage !== 'LOST' && proposal.stage !== 'POLICY_ISSUED'
  const willTransitionToPolicyIssued = proposal.stage === 'PAYMENT'
  const contactNeedsPromotion = !contact?.clientId
  function dispatchAdvance() {
    advanceMutation.mutate(proposal.id, {
      onError: (error) => {
        if (
          error instanceof ApiError &&
          error.code === 'CONTACT_NOT_PROMOTED'
        ) {
          setPromoteOpen(true)
        }
      },
    })
  }
  function handleAdvance() {
    if (willTransitionToPolicyIssued && contactNeedsPromotion) {
      setPromoteOpen(true)
      return
    }
    dispatchAdvance()
  }
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
      <HeaderSection
        proposalId={proposalId}
        proposal={proposal}
        pdfPending={pdfMutation.isPending}
        sendQuotePending={sendQuoteMutation.isPending}
        onGeneratePdf={() => pdfMutation.mutate()}
        onSendQuote={() => sendQuoteMutation.mutate()}
      />
      <Separator />
      <CoreInfoSection
        proposal={proposal}
        proposalId={proposalId}
        existingPolicyId={existingPolicy?.id}
      />
      <EndorsementSection proposal={proposal} />
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
      <Separator />
      <DatesSection proposal={proposal} />
      <InsuredObjectSection proposal={proposal} />
      <Separator />
      <ProposalStageActions
        canAdvance={canAdvance}
        canMarkLost={canMarkLost}
        checklistBlocking={checklistBlocking}
        advancePending={advanceMutation.isPending}
        onAdvance={handleAdvance}
        onMarkLost={() => setShowLostDialog(true)}
      />
      <Separator />
      <DocumentsTabSection proposalId={proposalId} branch={proposal.branch} />
      <LostReasonDialog
        proposalId={showLostDialog ? proposalId : null}
        onClose={() => setShowLostDialog(false)}
      />
      {contactId && (
        <PromoteContactDialog
          open={promoteOpen}
          onOpenChange={setPromoteOpen}
          contactId={contactId}
          defaultLegalName={proposal.clientName ?? contact?.name ?? ''}
          onPromoted={() => {
            setPromoteOpen(false)
            dispatchAdvance()
          }}
        />
      )}
    </div>
  )
}
