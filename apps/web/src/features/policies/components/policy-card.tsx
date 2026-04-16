'use client'

import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/formatters'

import {
  POLICY_BRANCH_LABELS,
  POLICY_STATUS_BADGE_VARIANT,
  POLICY_STATUS_LABELS,
} from '../lib/constants'
import type { PolicyData } from '../lib/types'

interface PolicyCardProps {
  readonly policy: PolicyData
}

export function PolicyCard({ policy }: PolicyCardProps) {
  const router = useRouter()

  return (
    <div
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={() => router.push(`/policies/${policy.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/policies/${policy.id}`)
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{policy.policyNumber}</span>
        <Badge variant={POLICY_STATUS_BADGE_VARIANT[policy.status]}>
          {POLICY_STATUS_LABELS[policy.status]}
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm">
        {policy.clientName ?? '—'}
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Ramo</div>
          <Badge variant="outline" className="mt-0.5">
            {POLICY_BRANCH_LABELS[policy.branch]}
          </Badge>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Valor</div>
          <div>{formatCurrency(policy.premiumValueInCents)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Vigência</div>
          <div>
            {formatDate(policy.startDate)} – {formatDate(policy.endDate)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Criado em</div>
          <div>{formatDate(policy.createdAt)}</div>
        </div>
      </div>
    </div>
  )
}
