import { injectable, inject } from 'tsyringe'
import { randomUUID } from 'node:crypto'
import type {
  DocumentRepository,
  DocumentData,
  DocumentEntityType,
  DocumentType,
} from '../domain/document-repository.js'
import type { StorageProvider } from '../domain/storage-provider.js'

interface UploadDocumentInput {
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
