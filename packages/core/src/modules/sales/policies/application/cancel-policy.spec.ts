import { describe, expect, it, vi } from 'vitest'
import type {
  PolicyData,
  PolicyRepository,
} from '../domain/policy-repository.js'
import {
  PolicyNotFoundError,
  PolicyAlreadyCancelledError,
} from '../domain/policy-errors.js'
import { CancelPolicy } from './cancel-policy.js'

function makePolicyData(overrides: Partial<PolicyData> = {}): PolicyData {
  return {
    id: 'pol-1',
    organizationId: 'org-1',
    proposalId: 'prop-1',
    clientId: 'c-1',
    salespersonId: 'user-1',
    insurerId: null,
    policyNumber: 'POL-001',
    branch: 'AUTO',
    status: 'ACTIVE',
    premiumValueInCents: 100000,
    coverageDetails: null,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: PolicyData | null): PolicyRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findByPolicyNumber: vi.fn(),
    listActiveForClient: vi.fn(),
    updateMany: vi.fn(),
    findExpiring: vi.fn(),
    findMany: vi.fn(),
    cancel: vi.fn().mockImplementation(async (id, orgId, reason) => ({
      ...makePolicyData(),
      id,
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason,
    })),
  }
}

describe('CancelPolicy', () => {
  it('cancels an active policy', async () => {
    const repo = createMockRepo(makePolicyData({ status: 'ACTIVE' }))
    const useCase = new CancelPolicy(repo)
    const result = await useCase.execute('pol-1', 'org-1', 'Cliente solicitou')
    expect(repo.cancel).toHaveBeenCalledWith(
      'pol-1',
      'org-1',
      'Cliente solicitou'
    )
    expect(result.status).toBe('CANCELLED')
  })
  it('throws PolicyAlreadyCancelledError when policy is already cancelled', async () => {
    const repo = createMockRepo(makePolicyData({ status: 'CANCELLED' }))
    const useCase = new CancelPolicy(repo)
    await expect(useCase.execute('pol-1', 'org-1', 'reason')).rejects.toThrow(
      PolicyAlreadyCancelledError
    )
    expect(repo.cancel).not.toHaveBeenCalled()
  })
  it('throws PolicyNotFoundError when policy does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new CancelPolicy(repo)
    await expect(useCase.execute('missing', 'org-1', 'reason')).rejects.toThrow(
      PolicyNotFoundError
    )
    expect(repo.cancel).not.toHaveBeenCalled()
  })
})
