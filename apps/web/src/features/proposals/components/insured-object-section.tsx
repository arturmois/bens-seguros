'use client'

import { Separator } from '@/components/ui/separator'

import { useUpdateProposalDetails } from '../hooks/use-proposals'
import type {
  InsuranceBranch,
  InsuredObjectDetails,
  ProposalData,
} from '../lib/constants'
import { BranchFields } from './branch-fields'

const BRANCH_SECTION_TITLES: Record<InsuranceBranch, string> = {
  AUTO: 'Dados do Veículo',
  RESIDENTIAL: 'Dados do Imóvel',
  CONDOMINIUM: 'Dados do Condomínio',
  BUSINESS: 'Dados do Estabelecimento',
  LIFE: 'Dados do Segurado',
  OTHER: 'Dados Gerais',
}

interface InsuredObjectSectionProps {
  readonly proposal: ProposalData
}

export function InsuredObjectSection({ proposal }: InsuredObjectSectionProps) {
  const updateMutation = useUpdateProposalDetails()

  if (proposal.stage === 'CAPTURE') {
    return null
  }

  function handleSubmit(data: {
    details: InsuredObjectDetails
    premiumValueInCents: number
    commissionBasisPoints: number
  }) {
    updateMutation.mutate({
      id: proposal.id,
      details: data.details,
      premiumValueInCents: data.premiumValueInCents,
      commissionBasisPoints: data.commissionBasisPoints,
    })
  }

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {BRANCH_SECTION_TITLES[proposal.branch]}
        </h3>
        <BranchFields
          branch={proposal.branch}
          defaultValues={proposal.details}
          defaultPremium={proposal.premiumValueInCents}
          defaultCommission={proposal.commissionPercentageInCents}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
        />
      </div>
    </>
  )
}
