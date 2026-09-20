import { describe, expect, it, vi } from 'vitest'
import {
  CommissionNotFoundError,
  CommissionNotPaidError,
} from '../domain/commission-errors.js'
import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { ReverseCommission } from './reverse-commission.js'

function makeCommissionData(
  overrides: Partial<CommissionData> = {}
): CommissionData {
  return {
    id: 'comm-1',
    organizationId: 'org-1',
    policyId: 'pol-1',
    salespersonId: 'user-1',
    status: 'PAID',
    commissionValueInCents: 15000,
    premiumValueInCents: 100000,
    percentageInBasisPoints: 1500,
    splitPercentage: 10000,
    approvedBy: 'admin-1',
    approvedAt: new Date(),
    paidAt: new Date(),
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    isReversal: false,
    originalCommissionId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: CommissionData | null): CommissionRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
    findPendingCommercial: vi.fn(),
    update: vi.fn(),
    reverseAtomic: vi.fn().mockImplementation(async (original, reversal) => {
      const originalJson = original.toJSON()
      const reversalJson = reversal.toJSON()
      return {
        savedOriginal: {
          ...originalJson,
          splitPercentage: originalJson.splitPercentage,
        } satisfies CommissionData,
        savedReversal: {
          ...reversalJson,
          splitPercentage: reversalJson.splitPercentage,
        } satisfies CommissionData,
      }
    }),
  }
}

describe('ReverseCommission', () => {
  it('creates a reversal and marks original as REVERSED', async () => {
    const data = makeCommissionData({ status: 'PAID' })
    const repo = createMockRepo(data)
    const useCase = new ReverseCommission(repo)
    const result = await useCase.execute('comm-1', 'org-1')
    expect(repo.reverseAtomic).toHaveBeenCalledTimes(1)
    expect(repo.save).not.toHaveBeenCalled()
    expect(repo.update).not.toHaveBeenCalled()
    const [updatedOriginal, createdReversal] =
      vi.mocked(repo.reverseAtomic).mock.calls[0] ?? []
    expect(createdReversal?.isReversal).toBe(true)
    expect(createdReversal?.originalCommissionId).toBe('comm-1')
    expect(createdReversal?.commissionValueInCents).toBe(-15000)
    expect(createdReversal?.status).toBe('PENDING_COMMERCIAL')
    expect(updatedOriginal?.status).toBe('REVERSED')
    expect(result.reversal.isReversal).toBe(true)
    expect(result.original.status).toBe('REVERSED')
  })
  it('throws CommissionNotFoundError when commission does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new ReverseCommission(repo)
    await expect(useCase.execute('missing', 'org-1')).rejects.toThrow(
      CommissionNotFoundError
    )
  })
  it('throws CommissionNotPaidError when commission is not PAID', async () => {
    const data = makeCommissionData({ status: 'APPROVED' })
    const repo = createMockRepo(data)
    const useCase = new ReverseCommission(repo)
    await expect(useCase.execute('comm-1', 'org-1')).rejects.toThrow(
      CommissionNotPaidError
    )
  })
  it('throws CommissionNotPaidError when commission is PENDING_COMMERCIAL', async () => {
    const data = makeCommissionData({ status: 'PENDING_COMMERCIAL' })
    const repo = createMockRepo(data)
    const useCase = new ReverseCommission(repo)
    await expect(useCase.execute('comm-1', 'org-1')).rejects.toThrow(
      CommissionNotPaidError
    )
  })
})
