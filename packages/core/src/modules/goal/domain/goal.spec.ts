import { describe, expect, it } from 'vitest'
import { createGoal, GoalInvariantError } from './goal.js'

describe('createGoal', () => {
  const validInput = {
    organizationId: 'org-1',
    year: 2026,
    month: 6,
    boardType: 'NEW_INSURANCE' as const,
    targetPremiumCents: 100_00,
  }

  it('returns a goal with the validated input when all fields are valid', () => {
    const goal = createGoal(validInput)
    expect(goal.organizationId).toBe('org-1')
    expect(goal.year).toBe(2026)
    expect(goal.month).toBe(6)
    expect(goal.boardType).toBe('NEW_INSURANCE')
    expect(goal.targetPremiumCents).toBe(100_00)
  })

  it('accepts targetPremiumCents = 0 (no goal for the month)', () => {
    const goal = createGoal({ ...validInput, targetPremiumCents: 0 })
    expect(goal.targetPremiumCents).toBe(0)
  })

  it('throws GoalInvariantError when year is below 2000', () => {
    expect(() => createGoal({ ...validInput, year: 1999 })).toThrow(
      GoalInvariantError
    )
  })

  it('throws GoalInvariantError when year is above 2100', () => {
    expect(() => createGoal({ ...validInput, year: 2101 })).toThrow(
      GoalInvariantError
    )
  })

  it('throws GoalInvariantError when month is below 1', () => {
    expect(() => createGoal({ ...validInput, month: 0 })).toThrow(
      GoalInvariantError
    )
  })

  it('throws GoalInvariantError when month is above 12', () => {
    expect(() => createGoal({ ...validInput, month: 13 })).toThrow(
      GoalInvariantError
    )
  })

  it('throws GoalInvariantError when boardType is ENDORSEMENT', () => {
    expect(() =>
      createGoal({
        ...validInput,
        boardType: 'ENDORSEMENT' as unknown as 'NEW_INSURANCE',
      })
    ).toThrow(GoalInvariantError)
  })

  it('throws GoalInvariantError when targetPremiumCents is negative', () => {
    expect(() => createGoal({ ...validInput, targetPremiumCents: -1 })).toThrow(
      GoalInvariantError
    )
  })
})
