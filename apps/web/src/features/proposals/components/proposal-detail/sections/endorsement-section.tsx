'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import type { ProposalData } from '../../../lib/constants'
import { InfoItem } from '../../proposal-detail-helpers'

interface EndorsementSectionProps {
  readonly proposal: ProposalData
}

export function EndorsementSection({ proposal }: EndorsementSectionProps) {
  if (proposal.boardType !== 'ENDORSEMENT' || !proposal.sourcePolicySnapshot) {
    return null
  }

  return (
    <>
      <Separator />
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-semibold">Apólice de Origem</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoItem
            label="Número"
            value={proposal.sourcePolicySnapshot.policyNumber}
          />
          <InfoItem
            label="Segurado"
            value={proposal.sourcePolicySnapshot.clientName}
          />
          <InfoItem
            label="Seguradora"
            value={proposal.sourcePolicySnapshot.insurerName ?? '—'}
          />
          <InfoItem
            label="Tipo de Endosso"
            value={proposal.endorsementType ?? '—'}
          />
          <InfoItem label="Motivo" value={proposal.endorsementReason ?? '—'} />
        </div>
        {proposal.sourcePolicyId && (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/policies/${proposal.sourcePolicyId}`} />}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver apólice
          </Button>
        )}
      </div>
    </>
  )
}
