import { describe, expect, it, vi } from 'vitest'
import type { ClaimData, ClaimRepository } from '../domain/claim-repository.js'
import { ListClaims } from './list-claims.js'

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

function makeMockRepo(): ClaimRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn().mockResolvedValue({
      items: [makeClaimData()],
      total: 1,
      nextCursor: null,
    }),
    updateStatus: vi.fn(),
    softDelete: vi.fn(),
  }
}

describe('ListClaims', () => {
  it('maps statusGroup=open to notIn COMPLETED REJECTED filter', async () => {
    const repo = makeMockRepo()
    const useCase = new ListClaims(repo)

    await useCase.execute(
      { organizationId: 'org-1', statusGroup: 'open' },
      { limit: 20 }
    )

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ statusGroup: 'open' }),
      expect.anything()
    )
  })

  it('maps statusGroup=closed to in COMPLETED REJECTED filter', async () => {
    const repo = makeMockRepo()
    const useCase = new ListClaims(repo)

    await useCase.execute(
      { organizationId: 'org-1', statusGroup: 'closed' },
      { limit: 20 }
    )

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ statusGroup: 'closed' }),
      expect.anything()
    )
  })

  it('passes status filter when statusGroup is not provided', async () => {
    const repo = makeMockRepo()
    const useCase = new ListClaims(repo)

    await useCase.execute(
      { organizationId: 'org-1', status: 'REGISTERED' },
      { limit: 20 }
    )

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REGISTERED' }),
      expect.anything()
    )
  })

  it('returns paginated claims list', async () => {
    const repo = makeMockRepo()
    const useCase = new ListClaims(repo)

    const result = await useCase.execute(
      { organizationId: 'org-1' },
      { limit: 20 }
    )

    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.nextCursor).toBeNull()
  })

  it('forwards statusIn array to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListClaims(repo)

    await useCase.execute(
      { organizationId: 'org-1', statusIn: ['IN_ANALYSIS', 'APPROVED'] },
      { limit: 20 }
    )

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ statusIn: ['IN_ANALYSIS', 'APPROVED'] }),
      expect.anything()
    )
  })

  it('forwards priorityIn array to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListClaims(repo)

    await useCase.execute(
      { organizationId: 'org-1', priorityIn: ['HIGH', 'URGENT'] },
      { limit: 20 }
    )

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ priorityIn: ['HIGH', 'URGENT'] }),
      expect.anything()
    )
  })
})
