import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../../../../shared/cache-service.js'
import type { StorageProvider } from '../../../../platform/storage/storage-provider.js'
import { OrganizationNotFoundError } from '../domain/organization-errors.js'
import type { OrganizationRepository } from '../domain/organization-repository.js'
import { GetOrganization } from './get-organization.js'

function makeMocks() {
  const orgRepo: OrganizationRepository = {
    findById: vi.fn(),
    update: vi.fn(),
    updateLogo: vi.fn(),
    slugTakenByAnother: vi.fn(),
    getCurrentLogo: vi.fn(),
  }
  const cache: CacheService = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }
  const storage: StorageProvider = {
    upload: vi.fn(),
    delete: vi.fn(),
    getSignedUrl: vi.fn(),
  }
  return { orgRepo, cache, storage }
}

describe('GetOrganization.execute', () => {
  it('returns the cached view without hitting the repository on cache hit', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    vi.mocked(cache.get).mockResolvedValue({
      id: 'org-1',
      name: 'Cached Org',
      slug: 'cached-org',
      logoKey: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const useCase = new GetOrganization(orgRepo, cache, storage)
    const view = await useCase.execute('org-1')
    expect(view.name).toBe('Cached Org')
    expect(vi.mocked(orgRepo.findById)).not.toHaveBeenCalled()
    expect(vi.mocked(cache.set)).not.toHaveBeenCalled()
  })
  it('signs the logo URL on cache hit when logoKey is present', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    vi.mocked(cache.get).mockResolvedValue({
      id: 'org-1',
      name: 'Org',
      slug: 'org',
      logoKey: 'organizations/org-1/logo.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    vi.mocked(storage.getSignedUrl).mockResolvedValue('https://signed/logo.png')
    const useCase = new GetOrganization(orgRepo, cache, storage)
    const view = await useCase.execute('org-1')
    expect(view.logo).toBe('https://signed/logo.png')
    expect(vi.mocked(storage.getSignedUrl)).toHaveBeenCalledWith(
      'organizations/org-1/logo.png'
    )
  })
  it('queries the repository on cache miss and populates the cache', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    vi.mocked(cache.get).mockResolvedValue(null)
    const now = new Date('2026-02-01T00:00:00.000Z')
    vi.mocked(orgRepo.findById).mockResolvedValue({
      id: 'org-1',
      name: 'Fresh Org',
      slug: 'fresh-org',
      logo: null,
      createdAt: now,
    })
    const useCase = new GetOrganization(orgRepo, cache, storage)
    const view = await useCase.execute('org-1')
    expect(view.name).toBe('Fresh Org')
    expect(vi.mocked(cache.set)).toHaveBeenCalledWith(
      'cache:org-1:org',
      expect.objectContaining({
        id: 'org-1',
        name: 'Fresh Org',
        slug: 'fresh-org',
        logoKey: null,
        createdAt: now.toISOString(),
      }),
      3600
    )
  })
  it('throws OrganizationNotFoundError when the repository returns null on cache miss', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    vi.mocked(cache.get).mockResolvedValue(null)
    vi.mocked(orgRepo.findById).mockResolvedValue(null)
    const useCase = new GetOrganization(orgRepo, cache, storage)
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      OrganizationNotFoundError
    )
    expect(vi.mocked(cache.set)).not.toHaveBeenCalled()
  })
  it('signs the logo URL on cache miss when logo key is present', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    vi.mocked(cache.get).mockResolvedValue(null)
    vi.mocked(orgRepo.findById).mockResolvedValue({
      id: 'org-1',
      name: 'Org',
      slug: 'org',
      logo: 'organizations/org-1/logo.png',
      createdAt: new Date(),
    })
    vi.mocked(storage.getSignedUrl).mockResolvedValue('https://signed/logo.png')
    const useCase = new GetOrganization(orgRepo, cache, storage)
    const view = await useCase.execute('org-1')
    expect(view.logo).toBe('https://signed/logo.png')
  })
})
