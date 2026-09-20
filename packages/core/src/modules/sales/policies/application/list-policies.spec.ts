import { describe, expect, it, vi } from 'vitest'

import type { PolicyRepository } from '../domain/policy-repository.js'
import { ListPolicies } from './list-policies.js'

describe('ListPolicies', () => {
  function makeMockRepo() {
    return {
      create: vi.fn(),
      findById: vi.fn(),
      findByPolicyNumber: vi.fn(),
      listActiveForClient: vi.fn(),
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
  it('forwards statusIn array to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListPolicies(repo)
    await useCase.execute(
      { organizationId: 'org-1', statusIn: ['ACTIVE', 'EXPIRED'] },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ statusIn: ['ACTIVE', 'EXPIRED'] }),
      expect.anything()
    )
  })
  it('forwards branchIn array to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListPolicies(repo)
    await useCase.execute(
      { organizationId: 'org-1', branchIn: ['AUTO', 'LIFE'] },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ branchIn: ['AUTO', 'LIFE'] }),
      expect.anything()
    )
  })
  it('forwards boardTypeIn array to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListPolicies(repo)
    await useCase.execute(
      { organizationId: 'org-1', boardTypeIn: ['RENEWAL', 'ENDORSEMENT'] },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ boardTypeIn: ['RENEWAL', 'ENDORSEMENT'] }),
      expect.anything()
    )
  })
  it('forwards both status and statusIn (repo decides priority)', async () => {
    const repo = makeMockRepo()
    const useCase = new ListPolicies(repo)
    await useCase.execute(
      { organizationId: 'org-1', status: 'ACTIVE', statusIn: ['EXPIRED'] },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', statusIn: ['EXPIRED'] }),
      expect.anything()
    )
  })
  it('forwards both branch and branchIn', async () => {
    const repo = makeMockRepo()
    const useCase = new ListPolicies(repo)
    await useCase.execute(
      { organizationId: 'org-1', branch: 'AUTO', branchIn: ['LIFE'] },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ branch: 'AUTO', branchIn: ['LIFE'] }),
      expect.anything()
    )
  })
  it('forwards both boardType and boardTypeIn', async () => {
    const repo = makeMockRepo()
    const useCase = new ListPolicies(repo)
    await useCase.execute(
      {
        organizationId: 'org-1',
        boardType: 'NEW_INSURANCE',
        boardTypeIn: ['RENEWAL'],
      },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        boardType: 'NEW_INSURANCE',
        boardTypeIn: ['RENEWAL'],
      }),
      expect.anything()
    )
  })
})
