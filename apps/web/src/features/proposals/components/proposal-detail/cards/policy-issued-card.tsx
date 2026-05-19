'use client'

import { CheckCircle2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { usePolicy } from '@/features/policies/hooks/use-policies'
import { formatDate } from '@/lib/formatters'

import { IssuePolicyCard } from '../../issue-policy-card'

interface PolicyIssuedCardProps {
  readonly proposalId: string
  readonly policyId: string | null
}

export function PolicyIssuedCard({
  proposalId,
  policyId,
}: PolicyIssuedCardProps) {
  const { data, isLoading } = usePolicy(policyId ?? '')
  if (!policyId) {
    return <IssuePolicyCard proposalId={proposalId} policyId={null} />
  }
  const policy = data?.data
  return (
    <div className="flex items-center gap-4 rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-4 dark:bg-emerald-950/30">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/90 text-white">
        <CheckCircle2 className="size-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
          Apólice Emitida
        </p>
        {isLoading || !policy ? (
          <p className="mt-1 text-sm text-emerald-900/70 dark:text-emerald-100/70">
            Carregando dados da apólice…
          </p>
        ) : (
          <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100">
            <strong>{policy.policyNumber}</strong> · Vigência{' '}
            {formatDate(policy.startDate)} → {formatDate(policy.endDate)}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
        render={<Link href={`/policies/${policyId}`} />}
      >
        <ExternalLink className="mr-1.5 size-3.5" /> Ver Apólice
      </Button>
    </div>
  )
}
