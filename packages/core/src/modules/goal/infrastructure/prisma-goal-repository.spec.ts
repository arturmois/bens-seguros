import type { PrismaClient } from '@repo/db'
import { describe, expect, it, vi } from 'vitest'
import { PrismaGoalRepository } from './prisma-goal-repository.js'

interface GoalRow {
  id: string
  organizationId: string
  year: number
  month: number
  boardType: 'NEW_INSURANCE' | 'RENEWAL'
  targetPremiumCents: number
  createdAt: Date
  updatedAt: Date
}

function makePrismaWithGoals(rows: ReadonlyArray<GoalRow>) {
  const findMany = vi.fn().mockResolvedValue(rows)
  const upsert = vi.fn().mockImplementation((args) => Promise.resolve(args))
  const transaction = vi.fn().mockImplementation(async (operations) => {
    if (Array.isArray(operations)) {
      return Promise.all(operations)
    }
    return operations({ goal: { upsert } })
  })
  const prisma = {
    goal: { findMany, upsert },
    $transaction: transaction,
  } as unknown as PrismaClient
  return { prisma, findMany, upsert, transaction }
}

describe('PrismaGoalRepository.findByYear', () => {
  it('returns goals for the given organization and year, ordered by month and boardType', async () => {
    const { prisma, findMany } = makePrismaWithGoals([
      {
        id: 'g-1',
        organizationId: 'org-1',
        year: 2026,
        month: 1,
        boardType: 'NEW_INSURANCE',
        targetPremiumCents: 100_00,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    const repo = new PrismaGoalRepository(prisma)
    const result = await repo.findByYear('org-1', 2026)
    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', year: 2026 },
      orderBy: [{ month: 'asc' }, { boardType: 'asc' }],
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      organizationId: 'org-1',
      year: 2026,
      month: 1,
      boardType: 'NEW_INSURANCE',
      targetPremiumCents: 100_00,
    })
  })

  it('returns empty array when no goals exist', async () => {
    const { prisma } = makePrismaWithGoals([])
    const repo = new PrismaGoalRepository(prisma)
    const result = await repo.findByYear('org-1', 2026)
    expect(result).toEqual([])
  })
})

describe('PrismaGoalRepository.upsertMany', () => {
  it('runs a transaction with one upsert per entry', async () => {
    const { prisma, upsert, transaction } = makePrismaWithGoals([])
    const repo = new PrismaGoalRepository(prisma)
    await repo.upsertMany('org-1', 2026, [
      { month: 1, boardType: 'NEW_INSURANCE', targetPremiumCents: 100_00 },
      { month: 1, boardType: 'RENEWAL', targetPremiumCents: 200_00 },
    ])
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledTimes(2)
    expect(upsert).toHaveBeenCalledWith({
      where: {
        organizationId_year_month_boardType: {
          organizationId: 'org-1',
          year: 2026,
          month: 1,
          boardType: 'NEW_INSURANCE',
        },
      },
      create: {
        organizationId: 'org-1',
        year: 2026,
        month: 1,
        boardType: 'NEW_INSURANCE',
        targetPremiumCents: 100_00,
      },
      update: { targetPremiumCents: 100_00 },
    })
  })

  it('is a no-op when entries are empty', async () => {
    const { prisma, transaction } = makePrismaWithGoals([])
    const repo = new PrismaGoalRepository(prisma)
    await repo.upsertMany('org-1', 2026, [])
    expect(transaction).not.toHaveBeenCalled()
  })
})
