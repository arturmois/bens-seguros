'use client'

import { useRouter } from 'next/navigation'

import { formatCurrency, formatDate, formatPercentage } from '@/lib/formatters'

import type { CommissionData } from '../lib/types'
import { CommissionStatusBadge } from './commission-status-badge'

interface CommissionCardProps {
  readonly commission: CommissionData
}

export function CommissionCard({ commission }: CommissionCardProps) {
  const router = useRouter()
  return (
    <div
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={() => router.push(`/commissions/${commission.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/commissions/${commission.id}`)
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{commission.salespersonName ?? '-'}</span>
        <CommissionStatusBadge status={commission.status} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Apólice</div>
          <div>{commission.policyNumber ?? '-'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Cliente</div>
          <div className="truncate">{commission.clientName ?? '-'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Prêmio</div>
          <div>{formatCurrency(commission.premiumValueInCents)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Percentual</div>
          <div>{formatPercentage(commission.percentageInBasisPoints)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Valor</div>
          <div className="font-medium">
            {formatCurrency(commission.commissionValueInCents)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Data</div>
          <div>{formatDate(commission.createdAt)}</div>
        </div>
      </div>
    </div>
  )
}
