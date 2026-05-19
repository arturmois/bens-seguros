'use client'

import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { useContact } from '@/features/contacts/hooks/use-contacts'
import { PromoteContactDialog } from '@/features/contacts/components/promote-contact-dialog'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { usePolicyByProposal } from '@/features/policies/hooks/use-policies'
import { ApiError } from '@/lib/api-client'

import { useChecklist } from '../../hooks/use-checklist'
import { useGenerateProposalPdf } from '../../hooks/use-generate-proposal-pdf'
import { useAdvanceProposal, useProposal } from '../../hooks/use-proposals'
import { useSendQuote } from '../../hooks/use-send-quote'
import { LostReasonDialog } from '../lost-reason-dialog'
import { DetailSkeleton } from '../proposal-detail-helpers'
import { EndorsementCard } from './cards/endorsement-card'
import { LostReasonCard } from './cards/lost-reason-card'
import { PolicyIssuedCard } from './cards/policy-issued-card'
import { RenewalCard } from './cards/renewal-card'
import { ProposalHero } from './proposal-hero'
import { ProposalTabs } from './proposal-tabs'
import { ChecklistTab } from './tabs/checklist-tab'
import { DocumentsTab } from './tabs/documents-tab'
import { InsuredObjectTab } from './tabs/insured-object-tab'
import { OverviewTab } from './tabs/overview-tab'

interface ProposalDetailProps {
  proposalId: string
}

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const router = useRouter()
  const { data, isLoading, isError } = useProposal(proposalId)
  const { data: existingPolicy } = usePolicyByProposal(proposalId)
  const { data: checklistData } = useChecklist(proposalId)
  const { data: documentsData } = useDocuments('PROPOSAL', proposalId)
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
  const checklistBlocking =
    !isTerminalStage &&
    proposal.stage !== 'CAPTURE' &&
    checklistData?.summary.canAdvance === false
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

  const checklistRequired = checklistData?.summary.required ?? 0
  const checklistCompleted = checklistData?.summary.requiredCompleted ?? 0
  const checklistHasPending = checklistData?.summary.canAdvance === false
  const documentsCount = documentsData?.length ?? 0

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
          {proposal.clientName ? proposal.clientName : 'Proposta'}
        </span>
      </nav>

      <ProposalHero
        proposal={proposal}
        pdfPending={pdfMutation.isPending}
        sendQuotePending={sendQuoteMutation.isPending}
        advancePending={advanceMutation.isPending}
        checklistBlocking={Boolean(checklistBlocking)}
        existingPolicyId={existingPolicy?.id ?? null}
        onGeneratePdf={() => pdfMutation.mutate()}
        onSendQuote={() => sendQuoteMutation.mutate()}
        onAdvance={handleAdvance}
        onMarkLost={() => setShowLostDialog(true)}
      />

      <ProposalTabs
        checklistRequired={checklistRequired}
        checklistCompleted={checklistCompleted}
        checklistHasPending={Boolean(checklistHasPending)}
        documentsCount={documentsCount}
        overviewSlot={
          <OverviewTab
            proposal={proposal}
            conditionalsSlot={
              <>
                {proposal.stage === 'LOST' && proposal.lostReason && (
                  <LostReasonCard reason={proposal.lostReason} />
                )}
                {proposal.stage === 'POLICY_ISSUED' && (
                  <PolicyIssuedCard
                    proposalId={proposalId}
                    policyId={existingPolicy?.id ?? null}
                  />
                )}
                <EndorsementCard proposal={proposal} />
                <RenewalCard proposal={proposal} />
              </>
            }
          />
        }
        insuredObjectSlot={<InsuredObjectTab proposal={proposal} />}
        checklistSlot={<ChecklistTab proposalId={proposalId} />}
        documentsSlot={
          <DocumentsTab proposalId={proposalId} branch={proposal.branch} />
        }
      />

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
