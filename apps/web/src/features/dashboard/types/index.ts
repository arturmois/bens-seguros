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

export interface DashboardStats {
  proposalsByStage: ProposalByStage[]
  activePolicies: number
  expiringPolicies: number
  claimsByPriority: ClaimByPriority[]
  commissionsThisMonth: CommissionByStatus[]
  conversionRate: ConversionRate
  monthlyTrends: MonthlyTrend[]
}
