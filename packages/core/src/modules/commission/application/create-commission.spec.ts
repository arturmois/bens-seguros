// packages/core/src/modules/commission/application/create-commission.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { CommissionRepository } from '../domain/commission-repository.js'
import { CreateCommission } from './create-commission.js'

function createMockRepo(): CommissionRepository {
  return {
    save: vi.fn().mockImplementation(async (commission) => commission.toJSON()),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  }
}

describe('CreateCommission', () => {
  it('creates commission with correct financial values', async () => {
    const repo = createMockRepo()
    const useCase = new CreateCommission(repo)

    const result = await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 100000,
      percentageInBasisPoints: 1500,
    })

    expect(repo.save).toHaveBeenCalledTimes(1)
    expect(result.organizationId).toBe('org-1')
    expect(result.status).toBe('PENDING_COMMERCIAL')
  })

  it('creates commission with default split percentage of 10000 (100%)', async () => {
    const repo = createMockRepo()
    const useCase = new CreateCommission(repo)

    await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 50000,
      percentageInBasisPoints: 2000,
    })

    const saved = vi.mocked(repo.save).mock.calls[0]?.[0]
    expect(saved?.splitPercentage).toBe(10000)
  })
})
