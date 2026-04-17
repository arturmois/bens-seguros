'use client'

import type { DashboardPreset, DashboardStats } from '../lib/constants'
import { ActivePoliciesCard } from './cards/active-policies-card'
import { NewInsuranceCard } from './cards/new-insurance-card'
import { PendingCommissionsCard } from './cards/pending-commissions-card'
import { ProposalsPendingCard } from './cards/proposals-pending-card'
import { Renewal7dCard } from './cards/renewal-7d-card'
import { WarningsCard } from './cards/warnings-card'

interface StatsCardsProps {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
  readonly preset: DashboardPreset
}

export function StatsCards({ data, isLoading, preset }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <NewInsuranceCard
        data={data?.newInsurance}
        isLoading={isLoading}
        preset={preset}
      />
      <Renewal7dCard
        count={data?.renewalsNext7Days}
        premiumCents={data?.renewal7dPremiumCents}
        isLoading={isLoading}
      />
      <ProposalsPendingCard
        data={data?.proposalsPending}
        isLoading={isLoading}
      />
      <WarningsCard data={data?.warnings} isLoading={isLoading} />
      <ActivePoliciesCard data={data} isLoading={isLoading} />
      <PendingCommissionsCard data={data} isLoading={isLoading} />
    </div>
  )
}
