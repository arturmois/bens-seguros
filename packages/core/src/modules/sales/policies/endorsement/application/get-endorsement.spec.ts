import { describe, expect, it, vi } from 'vitest'
import { EndorsementNotFoundError } from '../domain/endorsement-errors.js'
import type {
  EndorsementData,
  EndorsementRepository,
} from '../domain/endorsement-repository.js'
import { GetEndorsement } from './get-endorsement.js'

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

describe('GetEndorsement', () => {
  it('returns endorsement when found', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(mockEndorsement)
    const useCase = new GetEndorsement(repo)
    const result = await useCase.execute('end-1', 'org-1')
    expect(repo.findById).toHaveBeenCalledWith('end-1', 'org-1')
    expect(result.id).toBe('end-1')
  })
  it('throws EndorsementNotFoundError when not found', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(null)
    const useCase = new GetEndorsement(repo)
    await expect(useCase.execute('end-999', 'org-1')).rejects.toThrow(
      EndorsementNotFoundError
    )
  })
})
