import { describe, expect, it, vi } from 'vitest'
import type {
  EndorsementRepository,
  EndorsementData,
  EndorsementFilters,
} from '../domain/endorsement-repository.js'
import { ListEndorsements } from './list-endorsements.js'

const mockEndorsement: EndorsementData = {
  id: 'end-1',
  organizationId: 'org-1',
  policyId: 'pol-1',
  type: 'COVERAGE_CHANGE',
  description: 'Added flood coverage',
  effectiveDate: new Date('2026-06-01'),
  previousVersionSnapshot: { coverage: 'fire' },
  changes: { coverage: 'fire+flood' },
  createdBy: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function createMockRepo(): EndorsementRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
  }
}

describe('ListEndorsements', () => {
  it('returns paginated endorsements', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      items: [mockEndorsement],
      nextCursor: null,
    })
    const useCase = new ListEndorsements(repo)

    const filters: EndorsementFilters = { organizationId: 'org-1' }
    const result = await useCase.execute(filters, { limit: 20 })

    expect(repo.findMany).toHaveBeenCalledWith(filters, { limit: 20 })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe('end-1')
  })

  it('passes policyId filter to repository', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      items: [],
      nextCursor: null,
    })
    const useCase = new ListEndorsements(repo)

    const filters: EndorsementFilters = {
      organizationId: 'org-1',
      policyId: 'pol-1',
    }
    await useCase.execute(filters, { limit: 20 })

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ policyId: 'pol-1' }),
      { limit: 20 }
    )
  })

  it('returns empty list without error', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      items: [],
      nextCursor: null,
    })
    const useCase = new ListEndorsements(repo)

    const result = await useCase.execute(
      { organizationId: 'org-1' },
      { limit: 20 }
    )

    expect(result.items).toHaveLength(0)
    expect(result.nextCursor).toBeNull()
  })
})
