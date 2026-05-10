import type { PrismaClient } from '@repo/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaDashboardRepository } from './prisma-dashboard-repository.js'

function makePrisma() {
  const proposal = {
    groupBy: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  }
  const policy = {
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi
      .fn()
      .mockResolvedValue({ _sum: { premiumValueInCents: 0 }, _count: 0 }),
  }
  const claim = {
    groupBy: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  }
  const commission = {
    groupBy: vi.fn().mockResolvedValue([]),
    aggregate: vi
      .fn()
      .mockResolvedValue({ _sum: { commissionValueInCents: 0 } }),
  }
  const assistance = { count: vi.fn().mockResolvedValue(0) }
  const $queryRaw = vi.fn().mockResolvedValue([])
  const prisma = {
    proposal,
    policy,
    claim,
    commission,
    assistance,
    $queryRaw,
  } as unknown as PrismaClient
  return { prisma, proposal, policy, claim, commission, assistance, $queryRaw }
}

describe('PrismaDashboardRepository.getSnapshot', () => {
  let mocks: ReturnType<typeof makePrisma>
  beforeEach(() => {
    mocks = makePrisma()
  })

  it('uses PENDING_STAGES list when querying proposals pending bucket', async () => {
    const repo = new PrismaDashboardRepository(mocks.prisma)
    await repo.getSnapshot('org-1', '30d')
    const calls = mocks.proposal.count.mock.calls
    const pendingCall = calls.find((call) => {
      const where = call[0]?.where as { stage?: { in?: string[] } } | undefined
      return (
        where?.stage?.in !== undefined &&
        Array.isArray(where.stage.in) &&
        where.stage.in.includes('CAPTURE') &&
        where.stage.in.includes('QUOTE')
      )
    })
    expect(pendingCall).toBeDefined()
    const where = pendingCall?.[0]?.where as { stage: { in: string[] } }
    expect(where.stage.in).toEqual([
      'CAPTURE',
      'QUOTE',
      'PROTOCOL',
      'INSPECTION',
      'PAYMENT',
    ])
  })

  it('queries open claims by excluding COMPLETED and REJECTED for warnings', async () => {
    const repo = new PrismaDashboardRepository(mocks.prisma)
    await repo.getSnapshot('org-1', '30d')
    const warningsCall = mocks.claim.count.mock.calls.find((call) => {
      const where = call[0]?.where as
        | { status?: { notIn?: string[] } }
        | undefined
      return (
        where?.status?.notIn !== undefined &&
        Array.isArray(where.status.notIn) &&
        where.status.notIn.includes('COMPLETED') &&
        where.status.notIn.includes('REJECTED')
      )
    })
    expect(warningsCall).toBeDefined()
    const where = warningsCall?.[0]?.where as {
      organizationId: string
      deletedAt: null
      status: { notIn: string[] }
    }
    expect(where.organizationId).toBe('org-1')
    expect(where.deletedAt).toBeNull()
    expect(where.status.notIn).toEqual(['COMPLETED', 'REJECTED'])
  })

  it('counts open assistances using status: { not: COMPLETED }', async () => {
    const repo = new PrismaDashboardRepository(mocks.prisma)
    await repo.getSnapshot('org-1', '30d')
    expect(mocks.assistance.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          status: { not: 'COMPLETED' },
        }),
      })
    )
  })

  it('returns 100% changePercent when previous is 0 and current > 0 (proposals comparison)', async () => {
    mocks.proposal.count.mockImplementation(async (args) => {
      const where = (args?.where ?? {}) as {
        createdAt?: { gte?: Date; lte?: Date; lt?: Date }
      }
      if (where.createdAt?.lte && !where.createdAt.lt) return 5
      if (where.createdAt?.lt) return 0
      return 0
    })
    const repo = new PrismaDashboardRepository(mocks.prisma)
    const snapshot = await repo.getSnapshot('org-1', '30d')
    expect(snapshot.comparison.proposals.current).toBe(5)
    expect(snapshot.comparison.proposals.previous).toBe(0)
    expect(snapshot.comparison.proposals.changePercent).toBe(100)
  })

  it('returns 0 changePercent when both current and previous are 0', async () => {
    const repo = new PrismaDashboardRepository(mocks.prisma)
    const snapshot = await repo.getSnapshot('org-1', '30d')
    expect(snapshot.comparison.proposals).toEqual({
      current: 0,
      previous: 0,
      changePercent: 0,
    })
  })

  it('orders the conversion rate denominator by total proposals (rate=0 when no proposals)', async () => {
    const repo = new PrismaDashboardRepository(mocks.prisma)
    const snapshot = await repo.getSnapshot('org-1', '30d')
    expect(snapshot.conversionRate).toEqual({ total: 0, issued: 0, rate: 0 })
  })

  it('always passes organizationId and deletedAt: null on tenant-scoped queries', async () => {
    const repo = new PrismaDashboardRepository(mocks.prisma)
    await repo.getSnapshot('org-1', '30d')
    for (const call of mocks.proposal.count.mock.calls) {
      const where = call[0]?.where as Record<string, unknown> | undefined
      expect(where?.organizationId).toBe('org-1')
      expect(where?.deletedAt).toBeNull()
    }
    for (const call of mocks.policy.count.mock.calls) {
      const where = call[0]?.where as Record<string, unknown> | undefined
      expect(where?.organizationId).toBe('org-1')
      expect(where?.deletedAt).toBeNull()
    }
  })

  it('passes the orgId into the raw SQL ranking query', async () => {
    const repo = new PrismaDashboardRepository(mocks.prisma)
    await repo.getSnapshot('org-1', '30d')
    expect(mocks.$queryRaw).toHaveBeenCalled()
    const queryRawCalls = mocks.$queryRaw.mock.calls
    const rankingCall = queryRawCalls.find((call) =>
      call.some((arg: unknown) => arg === 'org-1')
    )
    expect(rankingCall).toBeDefined()
  })
})
