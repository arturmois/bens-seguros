import { describe, expect, it, vi } from 'vitest'
import type { DocumentData } from '../../../document/domain/document-repository.js'
import { AutoCompleteChecklistItems } from './auto-complete-checklist-items.js'
import { AttachProposalDocument } from './attach-proposal-document.js'
import type { UploadDocument } from '../../../document/application/upload-document.js'

function persistedDocument(
  overrides: Partial<DocumentData> = {}
): DocumentData {
  return {
    id: 'doc-1',
    organizationId: 'org-1',
    entityType: 'PROPOSAL',
    entityId: 'prop-1',
    clientId: null,
    type: 'DRIVER_LICENSE',
    fileName: 'cnh.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 12,
    storageKey: 'org-1/PROPOSAL/prop-1/cnh.pdf',
    url: null,
    createdBy: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function fakeUpload(document: DocumentData): UploadDocument {
  return {
    execute: vi.fn().mockResolvedValue(document),
  } as unknown as UploadDocument
}

function fakeAutoComplete(): AutoCompleteChecklistItems {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as AutoCompleteChecklistItems
}

const proposalUpload = {
  organizationId: 'org-1',
  entityType: 'PROPOSAL' as const,
  entityId: 'prop-1',
  fileName: 'cnh.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 test'),
}

describe('AttachProposalDocument', () => {
  it('DRIVER_LICENSE persists document and auto-completes driver_license', async () => {
    const document = persistedDocument({ type: 'DRIVER_LICENSE' })
    const uploadDocument = fakeUpload(document)
    const autoComplete = fakeAutoComplete()
    const useCase = new AttachProposalDocument(uploadDocument, autoComplete)
    const result = await useCase.execute({
      ...proposalUpload,
      type: 'DRIVER_LICENSE',
    })
    expect(uploadDocument.execute).toHaveBeenCalledOnce()
    expect(result.id).toBe('doc-1')
    expect(autoComplete.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      proposalId: 'prop-1',
      itemKey: 'driver_license',
    })
  })

  it('VEHICLE_REGISTRATION auto-completes vehicle_registration', async () => {
    const uploadDocument = fakeUpload(
      persistedDocument({
        type: 'VEHICLE_REGISTRATION',
        fileName: 'crlv.pdf',
      })
    )
    const autoComplete = fakeAutoComplete()
    const useCase = new AttachProposalDocument(uploadDocument, autoComplete)
    await useCase.execute({
      ...proposalUpload,
      type: 'VEHICLE_REGISTRATION',
      fileName: 'crlv.pdf',
    })
    expect(autoComplete.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      proposalId: 'prop-1',
      itemKey: 'vehicle_registration',
    })
  })

  it('auto-complete throw still returns the document', async () => {
    const document = persistedDocument()
    const uploadDocument = fakeUpload(document)
    const autoComplete = {
      execute: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as AutoCompleteChecklistItems
    const useCase = new AttachProposalDocument(uploadDocument, autoComplete)
    const result = await useCase.execute({
      ...proposalUpload,
      type: 'DRIVER_LICENSE',
    })
    expect(result.id).toBe('doc-1')
  })

  it('CLIENT entityType does not auto-complete', async () => {
    const uploadDocument = fakeUpload(
      persistedDocument({ entityType: 'CLIENT', entityId: 'client-1' })
    )
    const autoComplete = fakeAutoComplete()
    const useCase = new AttachProposalDocument(uploadDocument, autoComplete)
    await useCase.execute({
      ...proposalUpload,
      entityType: 'CLIENT',
      entityId: 'client-1',
      type: 'DRIVER_LICENSE',
    })
    expect(autoComplete.execute).not.toHaveBeenCalled()
  })

  it('missing type does not auto-complete', async () => {
    const uploadDocument = fakeUpload(persistedDocument())
    const autoComplete = fakeAutoComplete()
    const useCase = new AttachProposalDocument(uploadDocument, autoComplete)
    await useCase.execute({ ...proposalUpload })
    expect(autoComplete.execute).not.toHaveBeenCalled()
  })

  it('unmapped document type does not auto-complete', async () => {
    const uploadDocument = fakeUpload(persistedDocument({ type: 'OTHER' }))
    const autoComplete = fakeAutoComplete()
    const useCase = new AttachProposalDocument(uploadDocument, autoComplete)
    await useCase.execute({
      ...proposalUpload,
      type: 'OTHER',
    })
    expect(autoComplete.execute).not.toHaveBeenCalled()
  })
})
