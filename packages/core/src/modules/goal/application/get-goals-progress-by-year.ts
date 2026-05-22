import { inject, injectable } from 'tsyringe'
import type { DashboardRepository } from '../../dashboard/domain/dashboard-repository.js'
import type { GoalBoardType } from '../domain/goal.js'
import type { GoalRepository } from '../domain/goal-repository.js'

export interface GoalProgressEntry {
  readonly month: number
  readonly boardType: GoalBoardType
  readonly targetPremiumCents: number
  readonly realizedPremiumCents: number
}

export interface GoalsProgressSnapshot {
  readonly year: number
  readonly entries: readonly GoalProgressEntry[]
}

export interface GetGoalsProgressByYearInput {
  readonly organizationId: string
  readonly year: number
}

const BOARD_TYPES: readonly GoalBoardType[] = ['NEW_INSURANCE', 'RENEWAL']

@injectable()
export class GetGoalsProgressByYear {
  constructor(
    @inject('GoalRepository') private readonly goalRepo: GoalRepository,
    @inject('DashboardRepository')
    private readonly dashboardRepo: DashboardRepository
  ) {}

  async execute(
    input: GetGoalsProgressByYearInput
  ): Promise<GoalsProgressSnapshot> {
    const [goals, premiums] = await Promise.all([
      this.goalRepo.findByYear(input.organizationId, input.year),
      this.dashboardRepo.getPremiumByMonthAndBoardType(
        input.organizationId,
        input.year
      ),
    ])
    const buildKey = (m: number, bt: GoalBoardType) => `${m}:${bt}`
    const goalMap = new Map<string, number>()
    for (const g of goals) {
      goalMap.set(buildKey(g.month, g.boardType), g.targetPremiumCents)
    }
    const premiumMap = new Map<string, number>()
    for (const p of premiums) {
      premiumMap.set(buildKey(p.month, p.boardType), p.realizedCents)
    }
    const entries: GoalProgressEntry[] = []
    for (let m = 1; m <= 12; m++) {
      for (const bt of BOARD_TYPES) {
        const k = buildKey(m, bt)
        entries.push({
          month: m,
          boardType: bt,
          targetPremiumCents: goalMap.get(k) ?? 0,
          realizedPremiumCents: premiumMap.get(k) ?? 0,
        })
      }
    }
    return { year: input.year, entries }
  }
}
