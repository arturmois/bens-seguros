'use client'

import { useRouter } from 'next/navigation'

import { formatDate } from '@/lib/formatters'

import { formatClaimNumber } from '../lib/constants'
import type { ClaimData } from '../lib/types'
import { ClaimStatusBadge } from './claim-status-badge'
import { ClaimPriorityBadge } from './claim-priority-badge'

interface ClaimCardProps {
  readonly claim: ClaimData
}

export function ClaimCard({ claim }: ClaimCardProps) {
  const router = useRouter()
  return (
    <div
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={() => router.push(`/claims/${claim.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/claims/${claim.id}`)
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {formatClaimNumber(claim.claimNumber, claim.createdAt)}
        </span>
        <ClaimStatusBadge status={claim.status} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Cliente</div>
          <div className="truncate">{claim.clientName ?? '-'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Apólice</div>
          <div>{claim.policyNumber ?? '-'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Prioridade</div>
          <ClaimPriorityBadge priority={claim.priority} />
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Criado em</div>
          <div>{formatDate(claim.createdAt)}</div>
        </div>
      </div>
    </div>
  )
}
