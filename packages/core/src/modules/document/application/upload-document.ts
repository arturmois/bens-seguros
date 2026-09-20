import { randomUUID } from 'node:crypto'
import pino from 'pino'
import { inject, injectable } from 'tsyringe'
import { AutoCompleteChecklistItems } from '../../sales/proposals/application/auto-complete-checklist-items.js'
import type {
  DocumentData,
  DocumentEntityType,
  DocumentRepository,
  DocumentType,
} from '../domain/document-repository.js'
import type { StorageProvider } from '../../../platform/storage/storage-provider.js'
import { validateFileContent } from './validate-file-content.js'

const logger = pino({ name: 'upload-document' })

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

const DOCUMENT_TYPE_TO_ITEM_KEY: Partial<
  Record<DocumentType, 'driver_license' | 'vehicle_registration'>
> = {
  DRIVER_LICENSE: 'driver_license',
  VEHICLE_REGISTRATION: 'vehicle_registration',
}

@injectable()
export class UploadDocument {
  constructor(
    @inject('StorageProvider') private readonly storage: StorageProvider,
    @inject('DocumentRepository')
    private readonly documentRepo: DocumentRepository,
    @inject(AutoCompleteChecklistItems)
    private readonly autoComplete: AutoCompleteChecklistItems
  ) {}

  async execute(dto: UploadDocumentInput): Promise<DocumentData> {
    await validateFileContent(dto.buffer, dto.fileName)
    const storageKey = `${dto.organizationId}/${dto.entityType}/${dto.entityId}/${randomUUID()}-${dto.fileName}`
    await this.storage.upload(storageKey, dto.buffer, dto.mimeType)
    const document = await this.documentRepo.create({
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
    await this.triggerAutoComplete(dto)
    return document
  }

  private async triggerAutoComplete(dto: UploadDocumentInput): Promise<void> {
    if (dto.entityType !== 'PROPOSAL' || !dto.type) return
    const itemKey = DOCUMENT_TYPE_TO_ITEM_KEY[dto.type]
    if (!itemKey) return
    try {
      await this.autoComplete.execute({
        organizationId: dto.organizationId,
        proposalId: dto.entityId,
        itemKey,
      })
    } catch (error) {
      logger.warn(
        { err: error, proposalId: dto.entityId, itemKey },
        'Auto-complete falhou após upload de documento'
      )
    }
  }
}
