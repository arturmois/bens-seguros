import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CacheService } from '../../../shared/cache-service.js'
import type { CursorPage } from '../../client/domain/client-repository.js'
import type {
  InsurerFilters,
  InsurerRepository,
  InsurerSortField,
} from '../domain/insurer-repository.js'
import { ListInsurers } from './list-insurers.js'

function createMockCache(): CacheService {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
    delete: vi.fn(),
  }
}

describe('ListInsurers', () => {
  let repo: InsurerRepository
  let cache: CacheService
  let useCase: ListInsurers
  beforeEach(() => {
    repo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      findMany: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      update: vi.fn(),
    }
    cache = createMockCache()
    useCase = new ListInsurers(repo, cache)
  })
  it('passes sortBy=name asc through to the repository', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
    }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'name', sortOrder: 'asc' })
    )
  })
  it('passes sortBy=code asc through to the repository', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 10,
      sortBy: 'code',
      sortOrder: 'asc',
    }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'code', sortOrder: 'asc' })
    )
  })
  it('passes sortBy=active desc through to the repository', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 10,
      sortBy: 'active',
      sortOrder: 'desc',
    }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'active', sortOrder: 'desc' })
    )
  })
  it('passes sortBy=updatedAt desc through to the repository', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 10,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'updatedAt', sortOrder: 'desc' })
    )
  })
  it('passes undefined sortBy through to the repository (default passthrough)', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = { limit: 10 }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ limit: 10 })
    )
  })
  it('uses cache-aside on default listing (limit=20, sortBy=name asc, no filters)', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    }
    await useCase.execute(filters, page)
    expect(vi.mocked(cache.get)).toHaveBeenCalledWith('cache:org-1:insurers')
    expect(vi.mocked(cache.set)).toHaveBeenCalledWith(
      'cache:org-1:insurers',
      { items: [], nextCursor: null },
      86400
    )
  })
  it('returns the cached page on cache hit without calling the repository', async () => {
    vi.mocked(cache.get).mockResolvedValue({
      items: [{ id: 'cached' }],
      nextCursor: null,
    })
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    }
    const result = await useCase.execute(filters, page)
    expect(result.items).toEqual([{ id: 'cached' }])
    expect(repo.findMany).not.toHaveBeenCalled()
  })
  it('bypasses cache when filters or non-default page applied', async () => {
    const filters: InsurerFilters = {
      organizationId: 'org-1',
      active: true,
    }
    const page: CursorPage<InsurerSortField> = {
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    }
    await useCase.execute(filters, page)
    expect(vi.mocked(cache.get)).not.toHaveBeenCalled()
    expect(vi.mocked(cache.set)).not.toHaveBeenCalled()
    expect(repo.findMany).toHaveBeenCalledOnce()
  })
})
