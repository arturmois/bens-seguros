import { describe, expect, it, vi } from 'vitest'
import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { CreateCommissionForPolicy } from './create-commission-for-policy.js'

function makeCommissionData(
  overrides: Partial<CommissionData> = {}
): CommissionData {
  return {
    id: 'comm-1',
    organizationId: 'org-1',
    policyId: 'pol-1',
    salespersonId: 'user-1',
    status: 'PENDING_COMMERCIAL',
    commissionValueInCents: 15000,
    premiumValueInCents: 100000,
    percentageInBasisPoints: 1500,
    splitPercentage: 10000,
    approvedBy: null,
    approvedAt: null,
    paidAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    isReversal: false,
    originalCommissionId: null,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function createMockRepo(stored: CommissionData[] = []): CommissionRepository {
  return {
    save: vi.fn().mockImplementation(async (commission) => {
      const data = commission.toJSON()
      stored.push(data)
      return data
    }),
    findById: vi.fn(),
    findMany: vi.fn(),
    findPendingCommercial: vi.fn(),
    findNonReversalByPolicyId: vi
      .fn()
      .mockImplementation(async (policyId: string, organizationId: string) => {
        return (
          stored.find(
            (row) =>
              row.policyId === policyId &&
              row.organizationId === organizationId &&
              row.isReversal === false
          ) ?? null
        )
      }),
    update: vi.fn(),
    reverseAtomic: vi.fn(),
  }
}

const POSITIVE_INPUT = {
  organizationId: 'org-1',
  policyId: 'pol-1',
  salespersonId: 'user-1',
  premiumValueInCents: 100000,
  commissionPercentageInBasisPoints: 1500,
}

describe('CreateCommissionForPolicy', () => {
  it('percentage 0 does not save and returns null', async () => {
    const repo = createMockRepo()
    const useCase = new CreateCommissionForPolicy(repo)
    const result = await useCase.execute({
      ...POSITIVE_INPUT,
      commissionPercentageInBasisPoints: 0,
    })
    expect(repo.save).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('percentage -100 does not save and returns null', async () => {
    const repo = createMockRepo()
    const useCase = new CreateCommissionForPolicy(repo)
    const result = await useCase.execute({
      ...POSITIVE_INPUT,
      commissionPercentageInBasisPoints: -100,
    })
    expect(repo.save).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('second call same policyId returns existing and saves once', async () => {
    const repo = createMockRepo()
    const useCase = new CreateCommissionForPolicy(repo)
    const first = await useCase.execute(POSITIVE_INPUT)
    const second = await useCase.execute(POSITIVE_INPUT)
    expect(repo.save).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
    expect(first).not.toBeNull()
  })

  it('existing reversal does not block a new non-reversal save', async () => {
    const stored = [
      makeCommissionData({
        id: 'rev-1',
        isReversal: true,
        originalCommissionId: 'comm-old',
      }),
    ]
    const repo = createMockRepo(stored)
    const useCase = new CreateCommissionForPolicy(repo)
    const result = await useCase.execute(POSITIVE_INPUT)
    expect(repo.save).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(repo.save).mock.calls[0]?.[0]
    expect(saved?.isReversal).toBe(false)
    expect(saved?.policyId).toBe('pol-1')
    expect(result).not.toBeNull()
    expect(result?.isReversal).toBe(false)
  })
})
