'use client'

import { FileText, Shield, AlertTriangle, DollarSign } from 'lucide-react'

import { formatCurrency } from '@/lib/formatters'

import type { DashboardStats } from '../types'
import { ComparisonStatCard } from './comparison-stat-card'

interface StatsCardsProps {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
}

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  const activeProposals = data
    ? data.proposalsByStage.reduce((sum, s) => sum + s._count, 0)
    : 0
  const openClaims = data
    ? data.claimsByPriority.reduce((sum, c) => sum + c._count, 0)
    : 0
  const pendingCommissions = data
    ? data.commissionsThisMonth
        .filter(
          (c) =>
            c.status === 'PENDING_COMMERCIAL' || c.status === 'PENDING_ADMIN'
        )
        .reduce((sum, c) => sum + (c._sum.commissionValueInCents ?? 0), 0)
    : 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ComparisonStatCard
        title="Propostas ativas"
        value={activeProposals}
        icon={<FileText className="size-5" />}
        comparison={data?.comparison.proposals}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Apolices ativas"
        value={data?.activePolicies ?? 0}
        icon={<Shield className="size-5" />}
        comparison={data?.comparison.policies}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Sinistros abertos"
        value={openClaims}
        icon={<AlertTriangle className="size-5" />}
        comparison={data?.comparison.claims}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Comissoes pendentes"
        value={formatCurrency(pendingCommissions)}
        icon={<DollarSign className="size-5" />}
        comparison={data?.comparison.commissionsPending}
        isLoading={isLoading}
      />
    </div>
  )
}
