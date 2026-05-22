export { createGoal, GoalInvariantError } from './domain/goal.js'
export type { Goal, GoalBoardType, GoalInput } from './domain/goal.js'
export type {
  GoalRepository,
  UpsertGoalEntry,
} from './domain/goal-repository.js'
export { UpsertGoalsByYear } from './application/upsert-goals-by-year.js'
export type { UpsertGoalsByYearInput } from './application/upsert-goals-by-year.js'
export { GetGoalsProgressByYear } from './application/get-goals-progress-by-year.js'
export type {
  GetGoalsProgressByYearInput,
  GoalProgressEntry,
  GoalsProgressSnapshot,
} from './application/get-goals-progress-by-year.js'
export type { PremiumByMonthEntry } from '../dashboard/domain/dashboard-repository.js'
export { PrismaGoalRepository } from './infrastructure/prisma-goal-repository.js'
