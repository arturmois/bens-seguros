import { inject, injectable } from 'tsyringe'
import { createGoal } from '../domain/goal.js'
import type {
  GoalRepository,
  UpsertGoalEntry,
} from '../domain/goal-repository.js'

export interface UpsertGoalsByYearInput {
  readonly organizationId: string
  readonly year: number
  readonly entries: ReadonlyArray<UpsertGoalEntry>
}

@injectable()
export class UpsertGoalsByYear {
  constructor(
    @inject('GoalRepository') private readonly goalRepo: GoalRepository
  ) {}

  async execute(input: UpsertGoalsByYearInput): Promise<void> {
    for (const entry of input.entries) {
      createGoal({
        organizationId: input.organizationId,
        year: input.year,
        month: entry.month,
        boardType: entry.boardType,
        targetPremiumCents: entry.targetPremiumCents,
      })
    }
    await this.goalRepo.upsertMany(input.organizationId, input.year, [
      ...input.entries,
    ])
  }
}
