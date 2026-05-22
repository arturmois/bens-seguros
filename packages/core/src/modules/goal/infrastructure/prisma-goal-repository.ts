import type { PrismaClient } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import type { Goal } from '../domain/goal.js'
import { GoalInvariantError, isGoalBoardType } from '../domain/goal.js'
import type {
  GoalRepository,
  UpsertGoalEntry,
} from '../domain/goal-repository.js'

@injectable()
export class PrismaGoalRepository implements GoalRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async upsertMany(
    organizationId: string,
    year: number,
    entries: ReadonlyArray<UpsertGoalEntry>
  ): Promise<void> {
    if (entries.length === 0) return
    await this.prisma.$transaction(
      entries.map((e) =>
        this.prisma.goal.upsert({
          where: {
            organizationId_year_month_boardType: {
              organizationId,
              year,
              month: e.month,
              boardType: e.boardType,
            },
          },
          create: {
            organizationId,
            year,
            month: e.month,
            boardType: e.boardType,
            targetPremiumCents: e.targetPremiumCents,
          },
          update: {
            targetPremiumCents: e.targetPremiumCents,
          },
        })
      )
    )
  }

  async findByYear(
    organizationId: string,
    year: number
  ): Promise<readonly Goal[]> {
    const rows = await this.prisma.goal.findMany({
      where: { organizationId, year },
      orderBy: [{ month: 'asc' }, { boardType: 'asc' }],
    })
    return rows.map((r) => {
      if (!isGoalBoardType(r.boardType)) {
        throw new GoalInvariantError(
          `Goal row ${r.id} has invalid boardType: ${r.boardType}`
        )
      }
      return {
        organizationId: r.organizationId,
        year: r.year,
        month: r.month,
        boardType: r.boardType,
        targetPremiumCents: r.targetPremiumCents,
      }
    })
  }
}
