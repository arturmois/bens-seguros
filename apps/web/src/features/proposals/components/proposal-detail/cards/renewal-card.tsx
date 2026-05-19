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
      <div className="flex items-center gap-4 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950/30">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/90 text-white">
          <RotateCw className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-200">
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
    <div className="flex items-center gap-4 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950/30">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/90 text-white">
        <RotateCw className="size-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-200">
          Apólice em Renovação
        </p>
        {isLoading || !policy ? (
          <p className="mt-1 text-sm text-blue-900/70 dark:text-blue-100/70">
            Carregando...
          </p>
        ) : (
          <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">
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
          className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/40"
          render={<Link href={`/policies/${renewalId}`} />}
        >
          <ExternalLink className="mr-1.5 size-3.5" /> Ver
        </Button>
      )}
    </div>
  )
}
