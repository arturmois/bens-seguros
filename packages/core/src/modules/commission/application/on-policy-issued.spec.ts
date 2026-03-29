// packages/core/src/modules/commission/application/on-policy-issued.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { CommissionRepository } from '../domain/commission-repository.js'
import { OnPolicyIssued } from './on-policy-issued.js'

function createMockRepo(): CommissionRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    reverseAtomic: vi.fn(),
  }
}

describe('OnPolicyIssued', () => {
  it('creates commission from policy data', async () => {
    const repo = createMockRepo()
    const useCase = new OnPolicyIssued(repo)

    await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 100000,
      commissionPercentageInBasisPoints: 1500,
    })

    expect(repo.save).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(repo.save).mock.calls[0]?.[0]
    expect(saved?.organizationId).toBe('org-1')
    expect(saved?.policyId).toBe('pol-1')
    expect(saved?.salespersonId).toBe('user-1')
    expect(saved?.status).toBe('PENDING_COMMERCIAL')
    expect(saved?.premiumValueInCents).toBe(100000)
    expect(saved?.percentageInBasisPoints).toBe(1500)
    expect(saved?.commissionValueInCents).toBe(15000)
  })

  it('skips commission creation when percentage is zero', async () => {
    const repo = createMockRepo()
    const useCase = new OnPolicyIssued(repo)

    await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 100000,
      commissionPercentageInBasisPoints: 0,
    })

    expect(repo.save).not.toHaveBeenCalled()
  })

  it('skips commission creation when percentage is negative', async () => {
    const repo = createMockRepo()
    const useCase = new OnPolicyIssued(repo)

    await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 100000,
      commissionPercentageInBasisPoints: -100,
    })

    expect(repo.save).not.toHaveBeenCalled()
  })
})
