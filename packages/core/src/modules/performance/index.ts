export {
  createGoal,
  GoalInvariantError,
  UpsertGoalsByYear,
  GetGoalsProgressByYear,
  PrismaGoalRepository,
} from './goals/index.js'
export type {
  Goal,
  GoalBoardType,
  GoalInput,
  GoalRepository,
  UpsertGoalEntry,
  UpsertGoalsByYearInput,
  GetGoalsProgressByYearInput,
  GoalProgressEntry,
  GoalsProgressSnapshot,
  PremiumByMonthEntry,
} from './goals/index.js'

export {
  DASHBOARD_PRESETS,
  presetToDays,
  BuildDashboardSnapshot,
  PrismaDashboardRepository,
} from './dashboard/index.js'
export type {
  DashboardRepository,
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
} from './dashboard/index.js'
