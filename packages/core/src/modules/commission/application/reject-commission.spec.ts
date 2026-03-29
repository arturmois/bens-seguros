import { describe, expect, it, vi } from 'vitest'
import {
  CommissionNotFoundError,
  InvalidCommissionTransitionError,
} from '../domain/commission-errors.js'
import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { RejectCommission } from './reject-commission.js'

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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: CommissionData | null): CommissionRepository {
  return {
    save: vi.fn().mockResolvedValue(data),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
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

describe('RejectCommission', () => {
  it('rejects commission from PENDING_COMMERCIAL status', async () => {
    const data = makeCommissionData({ status: 'PENDING_COMMERCIAL' })
    const repo = createMockRepo(data)
    const useCase = new RejectCommission(repo)

    await useCase.execute({
      id: 'comm-1',
      organizationId: 'org-1',
      userId: 'rejector-1',
      reason: 'Valores incorretos',
    })

    expect(repo.update).toHaveBeenCalledTimes(1)
    const savedCommission = vi.mocked(repo.update).mock.calls[0]?.[0]
    expect(savedCommission?.status).toBe('REJECTED')
    expect(savedCommission?.rejectedBy).toBe('rejector-1')
    expect(savedCommission?.rejectionReason).toBe('Valores incorretos')
  })

  it('rejects commission from PENDING_ADMIN status', async () => {
    const data = makeCommissionData({ status: 'PENDING_ADMIN' })
    const repo = createMockRepo(data)
    const useCase = new RejectCommission(repo)

    await useCase.execute({
      id: 'comm-1',
      organizationId: 'org-1',
      userId: 'admin-1',
      reason: 'Duplicada',
    })

    expect(repo.update).toHaveBeenCalledTimes(1)
    const savedCommission = vi.mocked(repo.update).mock.calls[0]?.[0]
    expect(savedCommission?.status).toBe('REJECTED')
  })

  it('throws CommissionNotFoundError when commission does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new RejectCommission(repo)

    await expect(
      useCase.execute({
        id: 'missing',
        organizationId: 'org-1',
        userId: 'user-1',
        reason: 'Erro',
      })
    ).rejects.toThrow(CommissionNotFoundError)
  })

  it('throws InvalidCommissionTransitionError when commission is already PAID', async () => {
    const data = makeCommissionData({ status: 'PAID' })
    const repo = createMockRepo(data)
    const useCase = new RejectCommission(repo)

    await expect(
      useCase.execute({
        id: 'comm-1',
        organizationId: 'org-1',
        userId: 'user-1',
        reason: 'Tentativa invalida',
      })
    ).rejects.toThrow(InvalidCommissionTransitionError)
  })

  it('throws InvalidCommissionTransitionError when commission is APPROVED', async () => {
    const data = makeCommissionData({ status: 'APPROVED' })
    const repo = createMockRepo(data)
    const useCase = new RejectCommission(repo)

    await expect(
      useCase.execute({
        id: 'comm-1',
        organizationId: 'org-1',
        userId: 'user-1',
        reason: 'Nao deveria',
      })
    ).rejects.toThrow(InvalidCommissionTransitionError)
  })
})
