import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ProposalCursorPage,
  ProposalFilters,
  ProposalRepository,
} from '../domain/proposal-repository.js'
import { ListProposals } from './list-proposals.js'

function makeRepo(): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    listForView: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    listForClient: vi.fn(),
    markQuoteSent: vi.fn(),
    findActiveByContact: vi.fn().mockResolvedValue([]),
  }
}

describe('ListProposals', () => {
  let repo: ProposalRepository
  let useCase: ListProposals
  beforeEach(() => {
    repo = makeRepo()
    useCase = new ListProposals(repo)
  })
  it('passes sortBy and sortOrder through to the repository', async () => {
    const filters: ProposalFilters = { organizationId: 'org-1' }
    const page: ProposalCursorPage = {
      limit: 10,
      sortBy: 'clientName',
      sortOrder: 'asc',
    }
    await useCase.execute(filters, page)
    expect(repo.listForView).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'clientName', sortOrder: 'asc' })
    )
  })
  it('forwards default page when sortBy omitted', async () => {
    const filters: ProposalFilters = { organizationId: 'org-1' }
    const page: ProposalCursorPage = { limit: 10 }
    await useCase.execute(filters, page)
    expect(repo.listForView).toHaveBeenCalledWith(filters, page)
  })
  it('filters by multiple stages (stageIn) and updatedAt range', async () => {
    const updatedAtFrom = new Date('2026-04-10')
    const updatedAtTo = new Date('2026-04-17')
    await useCase.execute(
      {
        organizationId: 'org-1',
        stageIn: ['QUOTE', 'PROTOCOL'],
        updatedAtFrom,
        updatedAtTo,
      },
      { limit: 20 }
    )
    expect(repo.listForView).toHaveBeenCalledWith(
      expect.objectContaining({
        stageIn: ['QUOTE', 'PROTOCOL'],
        updatedAtFrom,
        updatedAtTo,
      }),
      expect.anything()
    )
  })
  it('forwards branchIn to repository when provided', async () => {
    await useCase.execute(
      { organizationId: 'org-1', branchIn: ['AUTO', 'RESIDENTIAL'] },
      { limit: 20 }
    )
    expect(repo.listForView).toHaveBeenCalledWith(
      expect.objectContaining({ branchIn: ['AUTO', 'RESIDENTIAL'] }),
      expect.anything()
    )
  })
  it('forwards salespersonIdIn to repository when provided', async () => {
    await useCase.execute(
      { organizationId: 'org-1', salespersonIdIn: ['user-1', 'user-2'] },
      { limit: 20 }
    )
    expect(repo.listForView).toHaveBeenCalledWith(
      expect.objectContaining({ salespersonIdIn: ['user-1', 'user-2'] }),
      expect.anything()
    )
  })
})
