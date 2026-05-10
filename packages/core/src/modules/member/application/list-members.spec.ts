import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../../../shared/cache-service.js'
import type { MemberRepository } from '../domain/member-repository.js'
import { ListMembers } from './list-members.js'

function makeMocks() {
  const repo: MemberRepository = {
    findById: vi.fn(),
    countByRole: vi.fn(),
    updateRole: vi.fn(),
    deactivate: vi.fn(),
    listOrganizationsForUser: vi.fn(),
    listActive: vi.fn(),
    existsActiveByEmail: vi.fn(),
    findContactsByRoles: vi.fn(),
  }
  const cache: CacheService = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }
  return { repo, cache }
}

const samplePage = {
  items: [
    {
      id: 'member-1',
      userId: 'user-1',
      name: 'Carlos',
      email: 'carlos@user.com',
      role: 'OWNER',
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  total: 1,
  nextCursor: null,
}

describe('ListMembers.execute', () => {
  it('returns cached page on cache hit when no cursor is provided', async () => {
    const { repo, cache } = makeMocks()
    vi.mocked(cache.get).mockResolvedValue(samplePage)
    const useCase = new ListMembers(repo, cache)
    const result = await useCase.execute({
      organizationId: 'org-1',
      limit: 50,
    })
    expect(result).toBe(samplePage)
    expect(vi.mocked(repo.listActive)).not.toHaveBeenCalled()
    expect(vi.mocked(cache.set)).not.toHaveBeenCalled()
  })
  it('falls through to repo on cache miss and populates cache', async () => {
    const { repo, cache } = makeMocks()
    vi.mocked(cache.get).mockResolvedValue(null)
    vi.mocked(repo.listActive).mockResolvedValue(samplePage)
    const useCase = new ListMembers(repo, cache)
    const result = await useCase.execute({
      organizationId: 'org-1',
      limit: 50,
    })
    expect(result).toBe(samplePage)
    expect(vi.mocked(cache.set)).toHaveBeenCalledWith(
      'cache:org-1:members',
      samplePage,
      3600
    )
  })
  it('skips the cache entirely when a cursor is provided (paginated requests)', async () => {
    const { repo, cache } = makeMocks()
    vi.mocked(repo.listActive).mockResolvedValue(samplePage)
    const useCase = new ListMembers(repo, cache)
    await useCase.execute({
      organizationId: 'org-1',
      limit: 50,
      cursor: 'member-100',
    })
    expect(vi.mocked(cache.get)).not.toHaveBeenCalled()
    expect(vi.mocked(cache.set)).not.toHaveBeenCalled()
    expect(vi.mocked(repo.listActive)).toHaveBeenCalledWith('org-1', {
      limit: 50,
      cursor: 'member-100',
    })
  })
})
