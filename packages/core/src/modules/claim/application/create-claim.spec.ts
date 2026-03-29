import { describe, expect, it, vi } from 'vitest'
import type {
  ClaimData,
  ClaimRepository,
  CreateClaimInput,
} from '../domain/claim-repository.js'
import { CreateClaim } from './create-claim.js'

function makeClaimData(overrides: Partial<ClaimData> = {}): ClaimData {
  return {
    id: 'claim-1',
    organizationId: 'org-1',
    claimNumber: 1,
    policyId: 'pol-1',
    clientId: 'c-1',
    insurerId: null,
    assignedToId: null,
    status: 'REGISTERED',
    priority: 'NORMAL',
    description: 'Vehicle collision on highway',
    estimatedValueInCents: null,
    incidentDate: new Date('2024-06-15'),
    incidentLocation: 'BR-101 km 42',
    reportedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(claimData: ClaimData | null = null): ClaimRepository {
  const created = claimData ?? makeClaimData()
  return {
    create: vi.fn().mockResolvedValue(created),
    findById: vi.fn().mockResolvedValue(claimData),
    findMany: vi.fn(),
    updateStatus: vi.fn(),
    softDelete: vi.fn(),
  }
}

describe('CreateClaim', () => {
  it('creates claim with auto-increment number', async () => {
    const claimData = makeClaimData({ claimNumber: 42 })
    const repo = createMockRepo(claimData)
    const useCase = new CreateClaim(repo)
    const dto: CreateClaimInput = {
      organizationId: 'org-1',
      policyId: 'pol-1',
      clientId: 'c-1',
      description: 'Vehicle collision on highway',
      incidentDate: new Date('2024-06-15'),
      incidentLocation: 'BR-101 km 42',
    }

    const result = await useCase.execute(dto)

    expect(repo.create).toHaveBeenCalledWith(dto)
    expect(result.claimNumber).toBe(42)
    expect(result.status).toBe('REGISTERED')
  })

  it('associates claim with policy', async () => {
    const claimData = makeClaimData({ policyId: 'pol-99' })
    const repo = createMockRepo(claimData)
    const useCase = new CreateClaim(repo)
    const dto: CreateClaimInput = {
      organizationId: 'org-1',
      policyId: 'pol-99',
      clientId: 'c-1',
      description: 'Water damage in kitchen',
    }

    const result = await useCase.execute(dto)

    expect(repo.create).toHaveBeenCalledWith(dto)
    expect(result.policyId).toBe('pol-99')
    expect(result.organizationId).toBe('org-1')
  })
})
