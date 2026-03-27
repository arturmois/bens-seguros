export interface ProposalByStage {
  stage: string
  _count: number
}

export interface ClaimByPriority {
  priority: string
  _count: number
}

export interface CommissionByStatus {
  status: string
  _count: number
  _sum: { commissionValueInCents: number | null }
}

export interface ConversionRate {
  total: number
  issued: number
  rate: number
}

export interface MonthlyTrend {
  month: string
  proposals: string
  issued: string
}

export interface ComparisonMetric {
  readonly current: number
  readonly previous: number
  readonly changePercent: number
}

export interface DashboardStats {
  proposalsByStage: ProposalByStage[]
  activePolicies: number
  expiringPolicies: number
  claimsByPriority: ClaimByPriority[]
  commissionsThisMonth: CommissionByStatus[]
  conversionRate: ConversionRate
  monthlyTrends: MonthlyTrend[]
  comparison: {
    proposals: ComparisonMetric
    policies: ComparisonMetric
    claims: ComparisonMetric
    commissionsPending: ComparisonMetric
  }
  totalPremium: ComparisonMetric
  averageTicket: ComparisonMetric
  commissionsReceivable: number
}

export type DashboardPreset = '7d' | '30d' | '90d' | '6m'
