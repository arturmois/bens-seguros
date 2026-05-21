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
    <div className="border-success bg-success/10 flex items-center gap-4 rounded-xl border-l-4 p-4">
      <div className="bg-success/90 flex size-9 shrink-0 items-center justify-center rounded-full text-white">
        <CheckCircle2 className="size-5" />
      </div>
      <div className="flex-1">
        <p className="text-success-foreground text-xs font-bold uppercase tracking-wider">
          Apólice Emitida
        </p>
        {isLoading || !policy ? (
          <p className="text-muted-foreground mt-1 text-sm">
            Carregando dados da apólice…
          </p>
        ) : (
          <p className="text-foreground mt-1 text-sm">
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
