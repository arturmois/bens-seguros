import { describe, expect, it, vi } from 'vitest'

import { ListPolicies } from './list-policies.js'
import type { PolicyRepository } from '../domain/policy-repository.js'

describe('ListPolicies', () => {
  function makeMockRepo() {
    return {
      create: vi.fn(),
      findById: vi.fn(),
      findByPolicyNumber: vi.fn(),
      findMany: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      cancel: vi.fn(),
    } as unknown as PolicyRepository
  }

  it('forwards boardType filter to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListPolicies(repo)

    await useCase.execute(
      { organizationId: 'org-1', boardType: 'NEW_INSURANCE' },
      { limit: 20 }
    )

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ boardType: 'NEW_INSURANCE' }),
      expect.anything()
    )
  })

  it('forwards createdFrom and createdTo to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListPolicies(repo)
    const from = new Date('2026-04-01')
    const to = new Date('2026-04-17')

    await useCase.execute(
      { organizationId: 'org-1', createdFrom: from, createdTo: to },
      { limit: 20 }
    )

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ createdFrom: from, createdTo: to }),
      expect.anything()
    )
  })

  it('forwards endDateFrom and endDateTo to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListPolicies(repo)
    const from = new Date('2026-04-17')
    const to = new Date('2026-04-24')

    await useCase.execute(
      { organizationId: 'org-1', endDateFrom: from, endDateTo: to },
      { limit: 20 }
    )

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ endDateFrom: from, endDateTo: to }),
      expect.anything()
    )
  })
})
