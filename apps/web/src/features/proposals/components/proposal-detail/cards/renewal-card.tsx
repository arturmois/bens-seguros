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
      <div className="flex items-center gap-4 rounded-xl border-info border-l-4 bg-info/10 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info/90 text-white">
          <RotateCw className="size-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-info-foreground text-xs uppercase tracking-wider">
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
    <div className="flex items-center gap-4 rounded-xl border-info border-l-4 bg-info/10 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info/90 text-white">
        <RotateCw className="size-5" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-info-foreground text-xs uppercase tracking-wider">
          Apólice em Renovação
        </p>
        {isLoading || !policy ? (
          <p className="mt-1 text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <p className="mt-1 text-foreground text-sm">
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
