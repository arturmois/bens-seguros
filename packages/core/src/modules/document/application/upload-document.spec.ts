import { describe, expect, it, vi } from 'vitest'
import { AutoCompleteChecklistItems } from '../../proposal/application/auto-complete-checklist-items.js'
import type {
  DocumentData,
  DocumentRepository,
} from '../domain/document-repository.js'
import type { StorageProvider } from '../../../platform/storage/storage-provider.js'
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

function createMockAutoComplete(): AutoCompleteChecklistItems {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as AutoCompleteChecklistItems
}

describe('UploadDocument', () => {
  it('uploads file to storage and creates document record', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const useCase = new UploadDocument(
      storage,
      docRepo,
      createMockAutoComplete()
    )
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
    const useCase = new UploadDocument(
      storage,
      docRepo,
      createMockAutoComplete()
    )
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

  it('calls auto-complete for driver_license when DRIVER_LICENSE uploaded for PROPOSAL', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new UploadDocument(storage, docRepo, autoComplete)
    await useCase.execute({
      organizationId: 'org-1',
      entityType: 'PROPOSAL',
      entityId: 'prop-1',
      type: 'DRIVER_LICENSE',
      fileName: 'cnh.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
    })
    expect(autoComplete.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      proposalId: 'prop-1',
      itemKey: 'driver_license',
    })
  })

  it('calls auto-complete for vehicle_registration when VEHICLE_REGISTRATION uploaded for PROPOSAL', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new UploadDocument(storage, docRepo, autoComplete)
    await useCase.execute({
      organizationId: 'org-1',
      entityType: 'PROPOSAL',
      entityId: 'prop-1',
      type: 'VEHICLE_REGISTRATION',
      fileName: 'crlv.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
    })
    expect(autoComplete.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      proposalId: 'prop-1',
      itemKey: 'vehicle_registration',
    })
  })

  it('does NOT call auto-complete for non-PROPOSAL entityType', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new UploadDocument(storage, docRepo, autoComplete)
    await useCase.execute({
      organizationId: 'org-1',
      entityType: 'CLIENT',
      entityId: 'client-1',
      type: 'DRIVER_LICENSE',
      fileName: 'cnh.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
    })
    expect(autoComplete.execute).not.toHaveBeenCalled()
  })

  it('does NOT call auto-complete for unrelated document types', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new UploadDocument(storage, docRepo, autoComplete)
    await useCase.execute({
      organizationId: 'org-1',
      entityType: 'PROPOSAL',
      entityId: 'prop-1',
      type: 'POLICY_PDF',
      fileName: 'apolice.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
    })
    expect(autoComplete.execute).not.toHaveBeenCalled()
  })

  it('does not fail upload if auto-complete throws', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const autoComplete = {
      execute: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as AutoCompleteChecklistItems
    const useCase = new UploadDocument(storage, docRepo, autoComplete)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        entityType: 'PROPOSAL',
        entityId: 'prop-1',
        type: 'DRIVER_LICENSE',
        fileName: 'cnh.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 test'),
      })
    ).resolves.toBeDefined()
  })
})
