import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../../../../shared/cache-service.js'
import type { StorageProvider } from '../../../../platform/storage/storage-provider.js'
import {
  InvalidLogoFileTypeError,
  LogoFileTooLargeError,
} from '../domain/organization-errors.js'
import type { OrganizationRepository } from '../domain/organization-repository.js'
import { UploadOrganizationLogo } from './upload-organization-logo.js'

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

describe('UploadOrganizationLogo.execute', () => {
  it('throws InvalidLogoFileTypeError on unsupported MIME type', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    const useCase = new UploadOrganizationLogo(orgRepo, cache, storage)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        buffer: Buffer.from('x'),
        mimeType: 'application/pdf',
      })
    ).rejects.toBeInstanceOf(InvalidLogoFileTypeError)
  })
  it('throws LogoFileTooLargeError when buffer exceeds 2MB', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    const useCase = new UploadOrganizationLogo(orgRepo, cache, storage)
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        buffer: oversized,
        mimeType: 'image/png',
      })
    ).rejects.toBeInstanceOf(LogoFileTooLargeError)
  })
  it('uploads + persists logo + invalidates cache and returns view + key snapshot', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    const now = new Date('2026-01-01T00:00:00.000Z')
    vi.mocked(orgRepo.getCurrentLogo).mockResolvedValue(null)
    vi.mocked(orgRepo.updateLogo).mockResolvedValue({
      id: 'org-1',
      name: 'Org',
      slug: 'org',
      logo: 'organizations/org-1/logo.png',
      createdAt: now,
    })
    vi.mocked(storage.getSignedUrl).mockResolvedValue('https://signed/logo.png')
    const useCase = new UploadOrganizationLogo(orgRepo, cache, storage)
    const result = await useCase.execute({
      organizationId: 'org-1',
      buffer: Buffer.from('image-bytes'),
      mimeType: 'image/png',
    })
    expect(result.newLogoKey).toBe('organizations/org-1/logo.png')
    expect(result.previousLogoKey).toBeNull()
    expect(result.view.logo).toBe('https://signed/logo.png')
    expect(vi.mocked(storage.upload)).toHaveBeenCalledWith(
      'organizations/org-1/logo.png',
      expect.any(Buffer),
      'image/png'
    )
    expect(vi.mocked(cache.delete)).toHaveBeenCalledWith('cache:org-1:org')
  })
  it('deletes the previous logo when one was set', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    const now = new Date()
    vi.mocked(orgRepo.getCurrentLogo).mockResolvedValue(
      'organizations/org-1/logo-old.png'
    )
    vi.mocked(orgRepo.updateLogo).mockResolvedValue({
      id: 'org-1',
      name: 'Org',
      slug: 'org',
      logo: 'organizations/org-1/logo.jpg',
      createdAt: now,
    })
    vi.mocked(storage.delete).mockResolvedValue(undefined)
    const useCase = new UploadOrganizationLogo(orgRepo, cache, storage)
    const result = await useCase.execute({
      organizationId: 'org-1',
      buffer: Buffer.from('img'),
      mimeType: 'image/jpeg',
    })
    expect(vi.mocked(storage.delete)).toHaveBeenCalledWith(
      'organizations/org-1/logo-old.png'
    )
    expect(result.previousLogoKey).toBe('organizations/org-1/logo-old.png')
    expect(result.newLogoKey).toBe('organizations/org-1/logo.jpg')
  })
  it('does not throw when deleting the previous logo fails (non-critical)', async () => {
    const { orgRepo, cache, storage } = makeMocks()
    const now = new Date()
    vi.mocked(orgRepo.getCurrentLogo).mockResolvedValue('old-key')
    vi.mocked(storage.delete).mockRejectedValue(new Error('storage down'))
    vi.mocked(orgRepo.updateLogo).mockResolvedValue({
      id: 'org-1',
      name: 'Org',
      slug: 'org',
      logo: 'organizations/org-1/logo.png',
      createdAt: now,
    })
    const useCase = new UploadOrganizationLogo(orgRepo, cache, storage)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        buffer: Buffer.from('img'),
        mimeType: 'image/png',
      })
    ).resolves.toBeDefined()
    expect(vi.mocked(storage.upload)).toHaveBeenCalled()
  })
})
