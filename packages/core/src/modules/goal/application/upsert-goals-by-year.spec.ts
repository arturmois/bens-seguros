import { describe, expect, it, vi } from 'vitest'
import { GoalInvariantError } from '../domain/goal.js'
import type { GoalRepository } from '../domain/goal-repository.js'
import { UpsertGoalsByYear } from './upsert-goals-by-year.js'

function makeRepo(): GoalRepository {
  return {
    upsertMany: vi.fn().mockResolvedValue(undefined),
    findByYear: vi.fn().mockResolvedValue([]),
  }
}

describe('UpsertGoalsByYear.execute', () => {
  it('forwards valid entries to repo.upsertMany', async () => {
    const repo = makeRepo()
    const useCase = new UpsertGoalsByYear(repo)
    await useCase.execute({
      organizationId: 'org-1',
      year: 2026,
      entries: [
        { month: 1, boardType: 'NEW_INSURANCE', targetPremiumCents: 100_00 },
        { month: 1, boardType: 'RENEWAL', targetPremiumCents: 200_00 },
      ],
    })
    expect(vi.mocked(repo.upsertMany)).toHaveBeenCalledWith('org-1', 2026, [
      { month: 1, boardType: 'NEW_INSURANCE', targetPremiumCents: 100_00 },
      { month: 1, boardType: 'RENEWAL', targetPremiumCents: 200_00 },
    ])
  })

  it('throws GoalInvariantError when any entry has invalid month', async () => {
    const repo = makeRepo()
    const useCase = new UpsertGoalsByYear(repo)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        year: 2026,
        entries: [
          { month: 13, boardType: 'NEW_INSURANCE', targetPremiumCents: 100_00 },
        ],
      })
    ).rejects.toBeInstanceOf(GoalInvariantError)
    expect(vi.mocked(repo.upsertMany)).not.toHaveBeenCalled()
  })

  it('throws GoalInvariantError when any entry has boardType ENDORSEMENT', async () => {
    const repo = makeRepo()
    const useCase = new UpsertGoalsByYear(repo)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        year: 2026,
        entries: [
          {
            month: 1,
            boardType: 'ENDORSEMENT' as unknown as 'NEW_INSURANCE',
            targetPremiumCents: 0,
          },
        ],
      })
    ).rejects.toBeInstanceOf(GoalInvariantError)
    expect(vi.mocked(repo.upsertMany)).not.toHaveBeenCalled()
  })

  it('throws GoalInvariantError when year is invalid', async () => {
    const repo = makeRepo()
    const useCase = new UpsertGoalsByYear(repo)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        year: 1999,
        entries: [
          { month: 1, boardType: 'NEW_INSURANCE', targetPremiumCents: 0 },
        ],
      })
    ).rejects.toBeInstanceOf(GoalInvariantError)
  })

  it('accepts an empty entries array (no-op upsert)', async () => {
    const repo = makeRepo()
    const useCase = new UpsertGoalsByYear(repo)
    await useCase.execute({
      organizationId: 'org-1',
      year: 2026,
      entries: [],
    })
    expect(vi.mocked(repo.upsertMany)).toHaveBeenCalledWith('org-1', 2026, [])
  })
})
