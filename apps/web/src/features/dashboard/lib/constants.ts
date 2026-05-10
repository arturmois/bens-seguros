import type {
  GetDashboardStats200Data,
  GetDashboardStats200DataProposalsByStageItem,
  GetDashboardStats200DataClaimsByPriorityItem,
  GetDashboardStats200DataCommissionsThisMonthItem,
  GetDashboardStats200DataConversionRate,
  GetDashboardStats200DataMonthlyTrendsItem,
  GetDashboardStats200DataRankingItem,
  GetDashboardStatsPreset,
} from '@/api/model'

export type DashboardStats = GetDashboardStats200Data
export type ProposalByStage = GetDashboardStats200DataProposalsByStageItem
export type ClaimByPriority = GetDashboardStats200DataClaimsByPriorityItem
export type CommissionByStatus =
  GetDashboardStats200DataCommissionsThisMonthItem
export type ConversionRate = GetDashboardStats200DataConversionRate
export type MonthlyTrend = GetDashboardStats200DataMonthlyTrendsItem
export type RankingEntry = GetDashboardStats200DataRankingItem
export type DashboardPreset = GetDashboardStatsPreset

export interface ComparisonMetric {
  readonly current: number
  readonly previous: number
  readonly changePercent: number
}
