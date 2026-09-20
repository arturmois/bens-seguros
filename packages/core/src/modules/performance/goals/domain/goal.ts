export const GOAL_BOARD_TYPES = ['NEW_INSURANCE', 'RENEWAL'] as const

export type GoalBoardType = (typeof GOAL_BOARD_TYPES)[number]

export function isGoalBoardType(value: string): value is GoalBoardType {
  return (GOAL_BOARD_TYPES as readonly string[]).includes(value)
}

export interface Goal {
  readonly organizationId: string
  readonly year: number
  readonly month: number
  readonly boardType: GoalBoardType
  readonly targetPremiumCents: number
}

export interface GoalInput {
  readonly organizationId: string
  readonly year: number
  readonly month: number
  readonly boardType: GoalBoardType
  readonly targetPremiumCents: number
}

export class GoalInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoalInvariantError'
  }
}

const MIN_YEAR = 2000
const MAX_YEAR = 2100

export function createGoal(input: GoalInput): Goal {
  if (input.year < MIN_YEAR || input.year > MAX_YEAR) {
    throw new GoalInvariantError(
      `year must be between ${MIN_YEAR} and ${MAX_YEAR}, got ${input.year}`
    )
  }
  if (input.month < 1 || input.month > 12) {
    throw new GoalInvariantError(
      `month must be between 1 and 12, got ${input.month}`
    )
  }
  if (input.boardType !== 'NEW_INSURANCE' && input.boardType !== 'RENEWAL') {
    throw new GoalInvariantError(
      `boardType must be NEW_INSURANCE or RENEWAL, got ${input.boardType}`
    )
  }
  if (input.targetPremiumCents < 0) {
    throw new GoalInvariantError(
      `targetPremiumCents must be >= 0, got ${input.targetPremiumCents}`
    )
  }
  return {
    organizationId: input.organizationId,
    year: input.year,
    month: input.month,
    boardType: input.boardType,
    targetPremiumCents: input.targetPremiumCents,
  }
}
