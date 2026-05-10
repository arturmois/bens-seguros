import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  calculateChangePercent,
  fetchNewInsuranceStats,
  fetchProposalsPendingByBucket,
  fetchRenewal7dPremium,
  fetchWarnings,
} from '../stats-helpers.js'

describe('calculateChangePercent', () => {
  it('returns 0 when both current and previous are 0', () => {
    expect(calculateChangePercent(0, 0)).toBe(0)
  })
  it('returns 100 when previous is 0 and current > 0', () => {
    expect(calculateChangePercent(5, 0)).toBe(100)
  })
  it('returns correct positive percentage', () => {
    expect(calculateChangePercent(12, 10)).toBe(20)
  })
  it('returns correct negative percentage', () => {
    expect(calculateChangePercent(8, 10)).toBe(-20)
  })
})

describe('fetchNewInsuranceStats', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  it('returns current, previous and changePercent for new insurance policies', async () => {
    const mockPrisma = {
      policy: {
        count: vi.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(10),
      },
    } as unknown as Parameters<typeof fetchNewInsuranceStats>[2]
    const ranges = {
      currentFrom: new Date('2026-04-01'),
      previousFrom: new Date('2026-03-01'),
      previousTo: new Date('2026-04-01'),
      now: new Date('2026-04-17'),
      thirtyDaysFromNow: new Date(),
      sevenDaysFromNow: new Date(),
    }
    const result = await fetchNewInsuranceStats('org-1', ranges, mockPrisma)
    expect(result).toEqual({
      current: 12,
      previous: 10,
      changePercent: 20,
    })
    expect(mockPrisma.policy.count).toHaveBeenCalledTimes(2)
  })
  it('handles zero previous period by reporting 100% when current > 0', async () => {
    const mockPrisma = {
      policy: {
        count: vi.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(0),
      },
    } as unknown as Parameters<typeof fetchNewInsuranceStats>[2]
    const result = await fetchNewInsuranceStats(
      'org-1',
      {
        currentFrom: new Date('2026-04-01'),
        previousFrom: new Date('2026-03-01'),
        previousTo: new Date('2026-04-01'),
        now: new Date('2026-04-17'),
        thirtyDaysFromNow: new Date(),
        sevenDaysFromNow: new Date(),
      },
      mockPrisma
    )
    expect(result.changePercent).toBe(100)
  })
})
describe('fetchRenewal7dPremium', () => {
  it('sums premiumValueInCents of active policies expiring in next 7d', async () => {
    const mockPrisma = {
      policy: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { premiumValueInCents: 2_345_000 },
        }),
      },
    } as unknown as Parameters<typeof fetchRenewal7dPremium>[2]
    const ranges = {
      currentFrom: new Date('2026-04-01'),
      previousFrom: new Date('2026-03-01'),
      previousTo: new Date('2026-04-01'),
      now: new Date('2026-04-17'),
      thirtyDaysFromNow: new Date('2026-05-17'),
      sevenDaysFromNow: new Date('2026-04-24'),
    }
    const result = await fetchRenewal7dPremium('org-1', ranges, mockPrisma)
    expect(result).toBe(2_345_000)
    const call = vi.mocked(mockPrisma.policy.aggregate).mock.calls[0]![0]
    expect(call.where).toMatchObject({
      organizationId: 'org-1',
      deletedAt: null,
      status: 'ACTIVE',
    })
    expect(call.where.endDate).toEqual({
      lte: ranges.sevenDaysFromNow,
      gte: ranges.now,
    })
    expect(call._sum).toEqual({ premiumValueInCents: true })
  })
  it('returns 0 when no matching policies', async () => {
    const mockPrisma = {
      policy: {
        aggregate: vi
          .fn()
          .mockResolvedValue({ _sum: { premiumValueInCents: null } }),
      },
    } as unknown as Parameters<typeof fetchRenewal7dPremium>[2]
    const ranges = {
      currentFrom: new Date(),
      previousFrom: new Date(),
      previousTo: new Date(),
      now: new Date(),
      thirtyDaysFromNow: new Date(),
      sevenDaysFromNow: new Date(),
    }
    expect(await fetchRenewal7dPremium('org-1', ranges, mockPrisma)).toBe(0)
  })
})
describe('fetchWarnings', () => {
  it('returns claims open + assistances open + total', async () => {
    const mockPrisma = {
      claim: { count: vi.fn().mockResolvedValue(5) },
      assistance: { count: vi.fn().mockResolvedValue(3) },
    } as unknown as Parameters<typeof fetchWarnings>[1]
    const result = await fetchWarnings('org-1', mockPrisma)
    expect(result).toEqual({ total: 8, claimsOpen: 5, assistancesOpen: 3 })
    const claimCall = vi.mocked(mockPrisma.claim.count).mock.calls[0]![0]
    expect(claimCall.where.status).toEqual({ notIn: ['COMPLETED', 'REJECTED'] })
    const assistCall = vi.mocked(mockPrisma.assistance.count).mock.calls[0]![0]
    expect(assistCall.where.status).toEqual({ not: 'COMPLETED' })
  })
  it('returns zeroes when both queries return 0', async () => {
    const mockPrisma = {
      claim: { count: vi.fn().mockResolvedValue(0) },
      assistance: { count: vi.fn().mockResolvedValue(0) },
    } as unknown as Parameters<typeof fetchWarnings>[1]
    expect(await fetchWarnings('org-1', mockPrisma)).toEqual({
      total: 0,
      claimsOpen: 0,
      assistancesOpen: 0,
    })
  })
})
describe('fetchProposalsPendingByBucket', () => {
  it('returns 3 bucket counts and total', async () => {
    const mockPrisma = {
      proposal: {
        count: vi
          .fn()
          .mockResolvedValueOnce(12)
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(2), // critical (7d+)
      },
    } as unknown as Parameters<typeof fetchProposalsPendingByBucket>[1]
    const result = await fetchProposalsPendingByBucket('org-1', mockPrisma)
    expect(result).toEqual({ total: 19, inDay: 12, warning: 5, critical: 2 })
    expect(mockPrisma.proposal.count).toHaveBeenCalledTimes(3)
    const inDayCall = vi.mocked(mockPrisma.proposal.count).mock.calls[0]![0]
    expect(inDayCall.where.stage).toEqual({
      in: ['CAPTURE', 'QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT'],
    })
    expect(inDayCall.where.deletedAt).toBe(null)
    expect(inDayCall.where.updatedAt).toHaveProperty('gte')
    const warningCall = vi.mocked(mockPrisma.proposal.count).mock.calls[1]![0]
    expect(warningCall.where.updatedAt).toHaveProperty('gte')
    expect(warningCall.where.updatedAt).toHaveProperty('lt')
    const criticalCall = vi.mocked(mockPrisma.proposal.count).mock.calls[2]![0]
    expect(criticalCall.where.updatedAt).toHaveProperty('lt')
    expect(criticalCall.where.updatedAt).not.toHaveProperty('gte')
  })
})
