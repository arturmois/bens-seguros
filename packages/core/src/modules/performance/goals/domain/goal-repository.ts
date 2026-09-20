import type { Goal, GoalBoardType } from './goal.js'

export interface UpsertGoalEntry {
  readonly month: number
  readonly boardType: GoalBoardType
  readonly targetPremiumCents: number
}

export interface GoalRepository {
  upsertMany(
    organizationId: string,
    year: number,
    entries: ReadonlyArray<UpsertGoalEntry>
  ): Promise<void>

  findByYear(organizationId: string, year: number): Promise<readonly Goal[]>
}
