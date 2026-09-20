import { randomUUID } from 'node:crypto'
import { inject, injectable } from 'tsyringe'
import type {
  DocumentData,
  DocumentEntityType,
  DocumentRepository,
  DocumentType,
} from '../domain/document-repository.js'
import type { StorageProvider } from '../../../platform/storage/storage-provider.js'
import { validateFileContent } from './validate-file-content.js'

export interface UploadDocumentInput {
  organizationId: string
  entityType: DocumentEntityType
  entityId: string
  clientId?: string
  type?: DocumentType
  fileName: string
  mimeType: string
  buffer: Buffer
  createdBy?: string
}

@injectable()
export class UploadDocument {
  constructor(
    @inject('StorageProvider') private readonly storage: StorageProvider,
    @inject('DocumentRepository')
    private readonly documentRepo: DocumentRepository
  ) {}

  async execute(dto: UploadDocumentInput): Promise<DocumentData> {
    await validateFileContent(dto.buffer, dto.fileName)
    const storageKey = `${dto.organizationId}/${dto.entityType}/${dto.entityId}/${randomUUID()}-${dto.fileName}`
    await this.storage.upload(storageKey, dto.buffer, dto.mimeType)
    return this.documentRepo.create({
      organizationId: dto.organizationId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      clientId: dto.clientId,
      type: dto.type,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.buffer.length,
      storageKey,
      createdBy: dto.createdBy,
    })
  }
}
