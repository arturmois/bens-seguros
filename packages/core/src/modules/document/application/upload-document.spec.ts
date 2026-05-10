import { describe, expect, it, vi } from 'vitest'
import type {
  DocumentData,
  DocumentRepository,
} from '../domain/document-repository.js'
import type { StorageProvider } from '../domain/storage-provider.js'
import { UploadDocument } from './upload-document.js'

vi.mock('./validate-file-content.js', () => ({
  validateFileContent: vi.fn().mockResolvedValue(undefined),
}))

function createMockStorage(): StorageProvider {
  return {
    upload: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn(),
    delete: vi.fn(),
  }
}

function createMockDocRepo(): DocumentRepository {
  return {
    create: vi.fn().mockImplementation(
      async (input) =>
        ({
          id: 'doc-1',
          ...input,
          url: null,
          createdAt: new Date(),
        }) satisfies DocumentData
    ),
    findById: vi.fn(),
    findByEntity: vi.fn(),
    upsertByStorageKey: vi.fn(),
    delete: vi.fn(),
  }
}

describe('UploadDocument', () => {
  it('uploads file to storage and creates document record', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const useCase = new UploadDocument(storage, docRepo)
    const buffer = Buffer.from('fake-pdf-content')
    const result = await useCase.execute({
      organizationId: 'org-1',
      entityType: 'PROPOSAL',
      entityId: 'prop-1',
      fileName: 'document.pdf',
      mimeType: 'application/pdf',
      buffer,
    })
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringContaining('org-1/PROPOSAL/prop-1/'),
      buffer,
      'application/pdf'
    )
    expect(docRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        entityType: 'PROPOSAL',
        entityId: 'prop-1',
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
      })
    )
    expect(result.id).toBe('doc-1')
  })
  it('generates unique storage key with org/entity path', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const useCase = new UploadDocument(storage, docRepo)
    await useCase.execute({
      organizationId: 'org-1',
      entityType: 'CLIENT',
      entityId: 'client-1',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('jpg'),
    })
    const storageKey = vi.mocked(storage.upload).mock.calls[0]?.[0] as string
    expect(storageKey).toMatch(/^org-1\/CLIENT\/client-1\//)
    expect(storageKey).toContain('photo.jpg')
  })
})
