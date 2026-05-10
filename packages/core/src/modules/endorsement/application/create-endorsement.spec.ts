import { describe, expect, it, vi } from 'vitest'
import type {
  EndorsementRepository,
  CreateEndorsementInput,
  EndorsementData,
} from '../domain/endorsement-repository.js'
import { CreateEndorsement } from './create-endorsement.js'

function createMockRepo(): EndorsementRepository {
  return {
    create: vi.fn().mockImplementation(
      async (dto: CreateEndorsementInput): Promise<EndorsementData> => ({
        id: 'end-1',
        organizationId: dto.organizationId,
        policyId: dto.policyId,
        type: dto.type,
        description: dto.description,
        effectiveDate: dto.effectiveDate,
        previousVersionSnapshot: dto.previousVersionSnapshot,
        changes: dto.changes,
        createdBy: dto.createdBy ?? null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      })
    ),
    findById: vi.fn(),
    findMany: vi.fn(),
  }
}

describe('CreateEndorsement', () => {
  it('delegates to repository with correct data', async () => {
    const repo = createMockRepo()
    const useCase = new CreateEndorsement(repo)
    const input: CreateEndorsementInput = {
      organizationId: 'org-1',
      policyId: 'pol-1',
      type: 'COVERAGE_CHANGE',
      description: 'Added flood coverage',
      effectiveDate: new Date('2026-06-01'),
      previousVersionSnapshot: { coverage: 'fire' },
      changes: { coverage: 'fire+flood' },
      createdBy: 'user-1',
    }
    const result = await useCase.execute(input)
    expect(repo.create).toHaveBeenCalledTimes(1)
    expect(repo.create).toHaveBeenCalledWith(input)
    expect(result.organizationId).toBe('org-1')
    expect(result.policyId).toBe('pol-1')
    expect(result.type).toBe('COVERAGE_CHANGE')
  })
})
