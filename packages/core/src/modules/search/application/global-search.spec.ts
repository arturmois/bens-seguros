import { describe, expect, it, vi } from 'vitest'
import type { SearchRepository } from '../domain/search-repository.js'
import { GlobalSearch } from './global-search.js'

function makeMockRepo(): SearchRepository {
  return {
    globalSearch: vi.fn().mockResolvedValue({
      clients: [],
      proposals: [],
      policies: [],
      claims: [],
    }),
  }
}

describe('GlobalSearch.execute', () => {
  it('forwards organizationId and query unchanged to the repository', async () => {
    const repo = makeMockRepo()
    const useCase = new GlobalSearch(repo)
    await useCase.execute('org-1', 'João', 12)
    expect(vi.mocked(repo.globalSearch)).toHaveBeenCalledWith(
      'org-1',
      'João',
      expect.any(Number)
    )
  })
  it('computes perEntityLimit as ceil(limit / 4) — round up case', async () => {
    const repo = makeMockRepo()
    const useCase = new GlobalSearch(repo)
    await useCase.execute('org-1', 'q', 10)
    expect(vi.mocked(repo.globalSearch)).toHaveBeenCalledWith('org-1', 'q', 3)
  })
  it('computes perEntityLimit as ceil(limit / 4) — exact division', async () => {
    const repo = makeMockRepo()
    const useCase = new GlobalSearch(repo)
    await useCase.execute('org-1', 'q', 8)
    expect(vi.mocked(repo.globalSearch)).toHaveBeenCalledWith('org-1', 'q', 2)
  })
  it('computes perEntityLimit as 1 when limit is below 4', async () => {
    const repo = makeMockRepo()
    const useCase = new GlobalSearch(repo)
    await useCase.execute('org-1', 'q', 1)
    expect(vi.mocked(repo.globalSearch)).toHaveBeenCalledWith('org-1', 'q', 1)
  })
  it('returns the repository result unchanged', async () => {
    const repo = makeMockRepo()
    const expectedResult = {
      clients: [{ id: 'c1', name: 'João', document: '123' }],
      proposals: [],
      policies: [],
      claims: [],
    }
    vi.mocked(repo.globalSearch).mockResolvedValue(expectedResult)
    const useCase = new GlobalSearch(repo)
    const result = await useCase.execute('org-1', 'q', 10)
    expect(result).toBe(expectedResult)
  })
})
