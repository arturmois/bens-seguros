// packages/core/src/modules/document/application/delete-document.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type {
  DocumentRepository,
  DocumentData,
} from '../domain/document-repository.js'
import type { StorageProvider } from '../domain/storage-provider.js'
import { DocumentNotFoundError } from '../domain/document-errors.js'
import { DeleteDocument } from './delete-document.js'

function makeDocumentData(overrides: Partial<DocumentData> = {}): DocumentData {
  return {
    id: 'doc-1',
    organizationId: 'org-1',
    entityType: 'PROPOSAL',
    entityId: 'prop-1',
    clientId: null,
    type: 'OTHER',
    fileName: 'contract.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    storageKey: 'org-1/PROPOSAL/prop-1/abc-contract.pdf',
    url: null,
    createdBy: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function createMockDocRepo(data: DocumentData | null): DocumentRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findByEntity: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockStorage(): StorageProvider {
  return {
    upload: vi.fn(),
    getSignedUrl: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('DeleteDocument', () => {
  it('deletes document from database and storage', async () => {
    const doc = makeDocumentData()
    const docRepo = createMockDocRepo(doc)
    const storage = createMockStorage()
    const useCase = new DeleteDocument(docRepo, storage)

    await useCase.execute('doc-1', 'org-1')

    expect(docRepo.delete).toHaveBeenCalledWith('doc-1', 'org-1')
    expect(storage.delete).toHaveBeenCalledWith(
      'org-1/PROPOSAL/prop-1/abc-contract.pdf'
    )
  })

  it('throws DocumentNotFoundError when document does not exist', async () => {
    const docRepo = createMockDocRepo(null)
    const storage = createMockStorage()
    const useCase = new DeleteDocument(docRepo, storage)

    await expect(useCase.execute('missing', 'org-1')).rejects.toThrow(
      DocumentNotFoundError
    )
    expect(docRepo.delete).not.toHaveBeenCalled()
    expect(storage.delete).not.toHaveBeenCalled()
  })
})
