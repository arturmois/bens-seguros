'use client'

import { DollarSign } from 'lucide-react'
import Link from 'next/link'

import { formatCurrency } from '@/lib/formatters'

import type { DashboardStats } from '../../lib/constants'
import { ComparisonStatCard } from '../comparison-stat-card'

interface PendingCommissionsCardProps {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
}

export function PendingCommissionsCard({
  data,
  isLoading,
}: PendingCommissionsCardProps) {
  const pendingCents = data
    ? data.commissionsThisMonth
        .filter(
          (c) =>
            c.status === 'PENDING_COMMERCIAL' || c.status === 'PENDING_ADMIN'
        )
        .reduce((sum, c) => sum + (c._sum.commissionValueInCents ?? 0), 0)
    : 0
  return (
    <Link
      href="/commissions?filter=pending"
      aria-label={`${formatCurrency(pendingCents)} em comissões pendentes, ver lista`}
      className="focus-visible:outline-primary block rounded-xl focus-visible:outline-2"
    >
      <ComparisonStatCard
        title="Comissões pendentes"
        value={formatCurrency(pendingCents)}
        icon={<DollarSign className="size-5" />}
        comparison={data?.comparison.commissionsPending}
        isLoading={isLoading}
      />
    </Link>
  )
}
