import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../../../shared/cache-service.js'
import type { StorageProvider } from '../../document/domain/storage-provider.js'
import {
  OrganizationNotFoundError,
  SlugConflictError,
} from '../domain/organization-errors.js'
import type { OrganizationRepository } from '../domain/organization-repository.js'
import { UpdateOrganization } from './update-organization.js'

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

describe('UpdateOrganization.execute', () => {
  it('returns the updated view + before snapshot on success', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    vi.mocked(orgRepo.slugTakenByAnother).mockResolvedValue(false)
    const now = new Date('2026-01-01T00:00:00.000Z')
    vi.mocked(orgRepo.findById).mockResolvedValue({
      id: 'org-1',
      name: 'Old Name',
      slug: 'old-slug',
      logo: null,
      createdAt: now,
    })
    vi.mocked(orgRepo.update).mockResolvedValue({
      id: 'org-1',
      name: 'New Name',
      slug: 'new-slug',
      logo: null,
      createdAt: now,
    })
    const useCase = new UpdateOrganization(orgRepo, cache, storage)
    const result = await useCase.execute({
      organizationId: 'org-1',
      name: 'New Name',
      slug: 'new-slug',
    })
    expect(result.view.name).toBe('New Name')
    expect(result.before).toEqual({ name: 'Old Name', slug: 'old-slug' })
  })
  it('throws SlugConflictError when slug is taken by another organization', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    vi.mocked(orgRepo.slugTakenByAnother).mockResolvedValue(true)
    const useCase = new UpdateOrganization(orgRepo, cache, storage)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        name: 'X',
        slug: 'taken',
      })
    ).rejects.toBeInstanceOf(SlugConflictError)
    expect(vi.mocked(orgRepo.update)).not.toHaveBeenCalled()
  })
  it('throws OrganizationNotFoundError when the organization does not exist', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    vi.mocked(orgRepo.slugTakenByAnother).mockResolvedValue(false)
    vi.mocked(orgRepo.findById).mockResolvedValue(null)
    const useCase = new UpdateOrganization(orgRepo, cache, storage)
    await expect(
      useCase.execute({
        organizationId: 'missing',
        name: 'X',
        slug: 'x',
      })
    ).rejects.toBeInstanceOf(OrganizationNotFoundError)
    expect(vi.mocked(orgRepo.update)).not.toHaveBeenCalled()
  })
  it('invalidates the org cache after a successful update', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    vi.mocked(orgRepo.slugTakenByAnother).mockResolvedValue(false)
    const now = new Date()
    vi.mocked(orgRepo.findById).mockResolvedValue({
      id: 'org-1',
      name: 'Old',
      slug: 'old',
      logo: null,
      createdAt: now,
    })
    vi.mocked(orgRepo.update).mockResolvedValue({
      id: 'org-1',
      name: 'New',
      slug: 'new',
      logo: null,
      createdAt: now,
    })
    const useCase = new UpdateOrganization(orgRepo, cache, storage)
    await useCase.execute({
      organizationId: 'org-1',
      name: 'New',
      slug: 'new',
    })
    expect(vi.mocked(cache.delete)).toHaveBeenCalledWith('cache:org-1:org')
  })
})
