export type DashboardPreset = '7d' | '30d' | '90d' | '6m'

export interface MetricComparison {
  readonly current: number
  readonly previous: number
  readonly changePercent: number
}

export interface ConversionRate {
  readonly total: number
  readonly issued: number
  readonly rate: number
}

export interface MonthlyTrend {
  readonly month: string
  readonly proposals: number
  readonly issued: number
}

export interface ProposalsByStage {
  readonly stage: string
  readonly _count: number
}

export interface ClaimsByPriority {
  readonly priority: string
  readonly _count: number
}

export interface CommissionByStatus {
  readonly status: string
  readonly _count: number
  readonly _sum: { readonly commissionValueInCents: number | null }
}

export interface SalespersonRanking {
  readonly salespersonId: string
  readonly salespersonName: string
  readonly policiesIssued: number
  readonly totalPremiumCents: number
  readonly averageTicketCents: number
}

export interface WarningsStats {
  readonly total: number
  readonly claimsOpen: number
  readonly assistancesOpen: number
}

export interface ProposalsPendingBuckets {
  readonly total: number
  readonly inDay: number
  readonly warning: number
  readonly critical: number
}

export interface DashboardSnapshot {
  readonly proposalsByStage: readonly ProposalsByStage[]
  readonly activePolicies: number
  readonly expiringPolicies: number
  readonly renewalsNext7Days: number
  readonly claimsByPriority: readonly ClaimsByPriority[]
  readonly commissionsThisMonth: readonly CommissionByStatus[]
  readonly conversionRate: ConversionRate
  readonly monthlyTrends: readonly MonthlyTrend[]
  readonly comparison: {
    readonly proposals: MetricComparison
    readonly policies: MetricComparison
    readonly claims: MetricComparison
    readonly commissionsPending: MetricComparison
  }
  readonly totalPremium: MetricComparison
  readonly averageTicket: MetricComparison
  readonly commissionsReceivable: number
  readonly ranking: readonly SalespersonRanking[]
  readonly newInsurance: MetricComparison
  readonly renewal7dPremiumCents: number
  readonly warnings: WarningsStats
  readonly proposalsPending: ProposalsPendingBuckets
}

export const DASHBOARD_PRESETS: readonly DashboardPreset[] = [
  '7d',
  '30d',
  '90d',
  '6m',
]

const PRESET_TO_DAYS: Record<DashboardPreset, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 180,
}

export function presetToDays(preset: DashboardPreset): number {
  return PRESET_TO_DAYS[preset]
}
