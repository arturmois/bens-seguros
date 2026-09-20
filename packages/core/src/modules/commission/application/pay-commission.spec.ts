import { describe, expect, it, vi } from 'vitest'
import {
  CommissionNotFoundError,
  InvalidCommissionTransitionError,
} from '../domain/commission-errors.js'
import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { PayCommission } from './pay-commission.js'

function makeCommissionData(
  overrides: Partial<CommissionData> = {}
): CommissionData {
  return {
    id: 'comm-1',
    organizationId: 'org-1',
    policyId: 'pol-1',
    salespersonId: 'user-1',
    status: 'APPROVED',
    commissionValueInCents: 15000,
    premiumValueInCents: 100000,
    percentageInBasisPoints: 1500,
    splitPercentage: 10000,
    approvedBy: 'admin-1',
    approvedAt: new Date(),
    paidAt: null,
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
    findNonReversalByPolicyId: vi.fn(),
    update: vi.fn().mockImplementation(async (commission) => {
      const json = commission.toJSON()
      return {
        ...json,
        splitPercentage: json.splitPercentage,
      } satisfies CommissionData
    }),
    reverseAtomic: vi.fn(),
  }
}

describe('PayCommission', () => {
  it('marks APPROVED commission as PAID with paidAt', async () => {
    const data = makeCommissionData({ status: 'APPROVED' })
    const repo = createMockRepo(data)
    const useCase = new PayCommission(repo)
    await useCase.execute('comm-1', 'org-1')
    expect(repo.update).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(repo.update).mock.calls[0]?.[0]
    expect(saved?.status).toBe('PAID')
    expect(saved?.paidAt).toBeInstanceOf(Date)
  })
  it('rejects payment from PENDING_COMMERCIAL status', async () => {
    const data = makeCommissionData({ status: 'PENDING_COMMERCIAL' })
    const repo = createMockRepo(data)
    const useCase = new PayCommission(repo)
    await expect(useCase.execute('comm-1', 'org-1')).rejects.toThrow(
      InvalidCommissionTransitionError
    )
  })
  it('rejects double payment from PAID status', async () => {
    const data = makeCommissionData({ status: 'PAID', paidAt: new Date() })
    const repo = createMockRepo(data)
    const useCase = new PayCommission(repo)
    await expect(useCase.execute('comm-1', 'org-1')).rejects.toThrow(
      InvalidCommissionTransitionError
    )
  })
  it('throws CommissionNotFoundError when commission does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new PayCommission(repo)
    await expect(useCase.execute('missing', 'org-1')).rejects.toThrow(
      CommissionNotFoundError
    )
    expect(repo.update).not.toHaveBeenCalled()
  })
})
