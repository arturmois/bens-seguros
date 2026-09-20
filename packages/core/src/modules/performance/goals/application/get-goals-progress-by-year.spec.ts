import { describe, expect, it, vi } from 'vitest'
import type {
  DashboardRepository,
  PremiumByMonthEntry,
} from '../../dashboard/domain/dashboard-repository.js'
import type { Goal } from '../domain/goal.js'
import type { GoalRepository } from '../domain/goal-repository.js'
import { GetGoalsProgressByYear } from './get-goals-progress-by-year.js'

function makeGoalRepo(goals: readonly Goal[] = []): GoalRepository {
  return {
    upsertMany: vi.fn(),
    findByYear: vi.fn().mockResolvedValue(goals),
  }
}

function makeDashboardRepo(
  premiums: readonly PremiumByMonthEntry[] = []
): DashboardRepository {
  return {
    getSnapshot: vi.fn(),
    getPremiumByMonthAndBoardType: vi.fn().mockResolvedValue(premiums),
  }
}

describe('GetGoalsProgressByYear.execute', () => {
  it('returns 24 entries (12 months × 2 boardTypes) with zeros when no goals and no policies', async () => {
    const useCase = new GetGoalsProgressByYear(
      makeGoalRepo(),
      makeDashboardRepo()
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      year: 2026,
    })
    expect(result.year).toBe(2026)
    expect(result.entries).toHaveLength(24)
    for (const entry of result.entries) {
      expect(entry.targetPremiumCents).toBe(0)
      expect(entry.realizedPremiumCents).toBe(0)
    }
  })

  it('always returns entries sorted by month ascending then boardType (NEW first)', async () => {
    const useCase = new GetGoalsProgressByYear(
      makeGoalRepo(),
      makeDashboardRepo()
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      year: 2026,
    })
    const expected: Array<[number, string]> = []
    for (let m = 1; m <= 12; m++) {
      expected.push([m, 'NEW_INSURANCE'])
      expected.push([m, 'RENEWAL'])
    }
    const actual = result.entries.map((e) => [e.month, e.boardType] as const)
    expect(actual).toEqual(expected)
  })

  it('merges goals with realized premiums correctly', async () => {
    const goals: readonly Goal[] = [
      {
        organizationId: 'org-1',
        year: 2026,
        month: 3,
        boardType: 'NEW_INSURANCE',
        targetPremiumCents: 500_00,
      },
    ]
    const premiums: readonly PremiumByMonthEntry[] = [
      { month: 3, boardType: 'NEW_INSURANCE', realizedCents: 350_00 },
      { month: 5, boardType: 'RENEWAL', realizedCents: 700_00 },
    ]
    const useCase = new GetGoalsProgressByYear(
      makeGoalRepo(goals),
      makeDashboardRepo(premiums)
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      year: 2026,
    })
    const m3New = result.entries.find(
      (e) => e.month === 3 && e.boardType === 'NEW_INSURANCE'
    )
    expect(m3New).toEqual({
      month: 3,
      boardType: 'NEW_INSURANCE',
      targetPremiumCents: 500_00,
      realizedPremiumCents: 350_00,
    })
    const m5Ren = result.entries.find(
      (e) => e.month === 5 && e.boardType === 'RENEWAL'
    )
    expect(m5Ren).toEqual({
      month: 5,
      boardType: 'RENEWAL',
      targetPremiumCents: 0,
      realizedPremiumCents: 700_00,
    })
  })

  it('forwards organizationId and year to both repos', async () => {
    const goalRepo = makeGoalRepo()
    const dashboardRepo = makeDashboardRepo()
    const useCase = new GetGoalsProgressByYear(goalRepo, dashboardRepo)
    await useCase.execute({ organizationId: 'org-42', year: 2025 })
    expect(vi.mocked(goalRepo.findByYear)).toHaveBeenCalledWith('org-42', 2025)
    expect(
      vi.mocked(dashboardRepo.getPremiumByMonthAndBoardType)
    ).toHaveBeenCalledWith('org-42', 2025)
  })
})
