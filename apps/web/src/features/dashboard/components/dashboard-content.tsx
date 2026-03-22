'use client';

import { StatsCards } from './stats-cards';
import { ProposalsByStage } from './proposals-by-stage';
import { CommissionsSummary } from './commissions-summary';
import { ConversionRate } from './conversion-rate';
import { ClaimsByPriority } from './claims-by-priority';
import { PoliciesExpiring } from './policies-expiring';
import { TrendChart } from './trend-chart';
import { useDashboardStats } from '../hooks/use-dashboard-stats';

export function DashboardContent() {
  const { data, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6">
      <StatsCards data={data} isLoading={isLoading} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProposalsByStage data={data?.proposalsByStage} isLoading={isLoading} />
        <CommissionsSummary data={data?.commissionsThisMonth} isLoading={isLoading} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ConversionRate data={data?.conversionRate} isLoading={isLoading} />
        <ClaimsByPriority data={data?.claimsByPriority} isLoading={isLoading} />
        <PoliciesExpiring count={data?.expiringPolicies} isLoading={isLoading} />
      </div>
      <TrendChart data={data?.monthlyTrends} isLoading={isLoading} />
    </div>
  );
}
