import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ListProposals } from './list-proposals.js'
import type {
  ProposalCursorPage,
  ProposalFilters,
  ProposalRepository,
} from '../domain/proposal-repository.js'

function makeRepo(): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
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

    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'clientName', sortOrder: 'asc' })
    )
  })

  it('forwards default page when sortBy omitted', async () => {
    const filters: ProposalFilters = { organizationId: 'org-1' }
    const page: ProposalCursorPage = { limit: 10 }

    await useCase.execute(filters, page)

    expect(repo.findMany).toHaveBeenCalledWith(filters, page)
  })

  it('filters by multiple stages and updatedAt range', async () => {
    const updatedAtFrom = new Date('2026-04-10')
    const updatedAtTo = new Date('2026-04-17')

    await useCase.execute(
      {
        organizationId: 'org-1',
        stages: ['QUOTE', 'PROTOCOL'],
        updatedAtFrom,
        updatedAtTo,
      },
      { limit: 20 }
    )

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        stages: ['QUOTE', 'PROTOCOL'],
        updatedAtFrom,
        updatedAtTo,
      }),
      expect.anything()
    )
  })
})
