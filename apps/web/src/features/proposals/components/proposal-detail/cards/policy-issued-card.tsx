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
    <div className="flex items-center gap-4 rounded-xl border-success border-l-4 bg-success/10 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/90 text-white">
        <CheckCircle2 className="size-5" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-success-foreground text-xs uppercase tracking-wider">
          Apólice Emitida
        </p>
        {isLoading || !policy ? (
          <p className="mt-1 text-muted-foreground text-sm">
            Carregando dados da apólice…
          </p>
        ) : (
          <p className="mt-1 text-foreground text-sm">
            <strong>{policy.policyNumber}</strong> · Vigência{' '}
            {formatDate(policy.startDate)} → {formatDate(policy.endDate)}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-success/30 text-success hover:bg-success/10"
        render={<Link href={`/policies/${policyId}`} />}
      >
        <ExternalLink className="mr-1.5 size-3.5" /> Ver Apólice
      </Button>
    </div>
  )
}
