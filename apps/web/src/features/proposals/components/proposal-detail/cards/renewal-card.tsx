'use client'

import { ExternalLink, RotateCw } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePolicy } from '@/features/policies/hooks/use-policies'
import { formatCurrency, formatDate } from '@/lib/formatters'

import type { ProposalData } from '../../../lib/constants'

interface RenewalCardProps {
  readonly proposal: ProposalData
}

export function RenewalCard({ proposal }: RenewalCardProps) {
  const renewalId = proposal.renewalPolicyId
  const renewalNumber = proposal.renewalPolicyNumber
  const { data, isLoading } = usePolicy(renewalId ?? '')

  if (!renewalId && !renewalNumber) return null

  if (!renewalId && renewalNumber) {
    return (
      <div className="border-info bg-info/10 flex items-center gap-4 rounded-xl border-l-4 p-4">
        <div className="bg-info/90 flex size-9 shrink-0 items-center justify-center rounded-full text-white">
          <RotateCw className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-info-foreground text-xs font-bold uppercase tracking-wider">
            Apólice Anterior · {renewalNumber}
          </p>
          <Badge variant="secondary" className="mt-1 text-xs">
            Não vinculada
          </Badge>
        </div>
      </div>
    )
  }

  const policy = data?.data
  return (
    <div className="border-info bg-info/10 flex items-center gap-4 rounded-xl border-l-4 p-4">
      <div className="bg-info/90 flex size-9 shrink-0 items-center justify-center rounded-full text-white">
        <RotateCw className="size-5" />
      </div>
      <div className="flex-1">
        <p className="text-info-foreground text-xs font-bold uppercase tracking-wider">
          Apólice em Renovação
        </p>
        {isLoading || !policy ? (
          <p className="text-muted-foreground mt-1 text-sm">Carregando...</p>
        ) : (
          <p className="text-foreground mt-1 text-sm">
            <strong>{policy.policyNumber}</strong> · Vigência{' '}
            {formatDate(policy.startDate)} → {formatDate(policy.endDate)} ·
            Prêmio anterior {formatCurrency(policy.premiumValueInCents)}
          </p>
        )}
      </div>
      {renewalId && (
        <Button
          variant="outline"
          size="sm"
          className="border-info/30 text-info hover:bg-info/10"
          render={<Link href={`/policies/${renewalId}`} />}
        >
          <ExternalLink className="mr-1.5 size-3.5" /> Ver
        </Button>
      )}
    </div>
  )
}
