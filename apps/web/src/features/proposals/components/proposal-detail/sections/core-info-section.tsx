'use client'

import { RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'

import { formatCurrency, formatDate } from '@/lib/formatters'

import type { ProposalData } from '../../../lib/constants'
import { InfoItem } from '../../proposal-detail-helpers'
import { IssuePolicyCard } from '../../issue-policy-card'
import { RenewalPolicyCard } from '../../renewal-policy-card'

interface CoreInfoSectionProps {
  readonly proposal: ProposalData
  readonly proposalId: string
  readonly existingPolicyId: string | undefined
}

export function CoreInfoSection({
  proposal,
  proposalId,
  existingPolicyId,
}: CoreInfoSectionProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoItem
          label="Contato"
          value={proposal.clientName ?? proposal.contactId}
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
      {proposal.stage === 'POLICY_ISSUED' && (
        <IssuePolicyCard proposalId={proposalId} policyId={existingPolicyId} />
      )}
      {proposal.renewalPolicyId ? (
        <RenewalPolicyCard policyId={proposal.renewalPolicyId} />
      ) : proposal.renewalPolicyNumber ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <RefreshCw className="size-4" />
              Apólice Anterior
            </CardTitle>
          </CardHeader>
          <CardPanel>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                {proposal.renewalPolicyNumber}
              </p>
              <Badge variant="secondary" className="text-xs">
                Não vinculada
              </Badge>
            </div>
          </CardPanel>
        </Card>
      ) : null}
    </>
  )
}
