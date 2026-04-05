import { describe, expect, it, vi } from 'vitest'
import type {
  OccurrenceData,
  OccurrenceRepository,
} from '../domain/occurrence-repository.js'
import { ListOccurrences } from './list-occurrences.js'

function makeOccurrenceData(
  overrides: Partial<OccurrenceData> = {}
): OccurrenceData {
  return {
    id: 'occ-1',
    claimId: 'claim-1',
    organizationId: 'org-1',
    type: 'STATUS_CHANGE',
    description: 'Status alterado para Em Análise',
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function makeOccurrenceRepo(results: OccurrenceData[]): OccurrenceRepository {
  return {
    create: vi.fn(),
    findByClaimId: vi.fn().mockResolvedValue(results),
  }
}

describe('ListOccurrences', () => {
  it('returns occurrences for claim scoped to tenant', async () => {
    const occurrences = [
      makeOccurrenceData({ id: 'occ-1' }),
      makeOccurrenceData({ id: 'occ-2', type: 'NOTE' }),
    ]
    const repo = makeOccurrenceRepo(occurrences)
    const useCase = new ListOccurrences(repo)

    const result = await useCase.execute('claim-1', 'org-1')

    expect(repo.findByClaimId).toHaveBeenCalledWith('claim-1', 'org-1')
    expect(result).toHaveLength(2)
    expect(result[0]?.id).toBe('occ-1')
  })

  it('passes organizationId to repository for tenant isolation', async () => {
    const repo = makeOccurrenceRepo([])
    const useCase = new ListOccurrences(repo)

    await useCase.execute('claim-99', 'org-tenant-a')

    expect(repo.findByClaimId).toHaveBeenCalledWith('claim-99', 'org-tenant-a')
  })

  it('returns empty list when claim has no occurrences', async () => {
    const repo = makeOccurrenceRepo([])
    const useCase = new ListOccurrences(repo)

    const result = await useCase.execute('claim-1', 'org-1')

    expect(result).toHaveLength(0)
  })

  it('returns occurrences with organizationId field', async () => {
    const repo = makeOccurrenceRepo([
      makeOccurrenceData({ organizationId: 'org-xyz' }),
    ])
    const useCase = new ListOccurrences(repo)

    const result = await useCase.execute('claim-1', 'org-xyz')

    expect(result[0]?.organizationId).toBe('org-xyz')
  })
})
