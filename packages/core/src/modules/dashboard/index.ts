export type { DashboardRepository } from './domain/dashboard-repository.js'
export type {
  ClaimsByPriority,
  CommissionByStatus,
  ConversionRate,
  DashboardPreset,
  DashboardSnapshot,
  MetricComparison,
  MonthlyTrend,
  ProposalsByStage,
  ProposalsPendingBuckets,
  SalespersonRanking,
  WarningsStats,
} from './domain/dashboard-snapshot.js'
export { DASHBOARD_PRESETS, presetToDays } from './domain/dashboard-snapshot.js'

export { BuildDashboardSnapshot } from './application/build-dashboard-snapshot.js'

export { PrismaDashboardRepository } from './infrastructure/prisma-dashboard-repository.js'
