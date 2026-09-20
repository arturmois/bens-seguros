import pino from 'pino'
import type {
  DocumentData,
  DocumentType,
} from '../../../document/domain/document-repository.js'
import {
  UploadDocument,
  type UploadDocumentInput,
} from '../../../document/application/upload-document.js'
import { AutoCompleteChecklistItems } from './auto-complete-checklist-items.js'

const logger = pino({ name: 'attach-proposal-document' })

const DOCUMENT_TYPE_TO_ITEM_KEY: Partial<
  Record<DocumentType, 'driver_license' | 'vehicle_registration'>
> = {
  DRIVER_LICENSE: 'driver_license',
  VEHICLE_REGISTRATION: 'vehicle_registration',
}

export class AttachProposalDocument {
  constructor(
    private readonly uploadDocument: UploadDocument,
    private readonly autoComplete: AutoCompleteChecklistItems
  ) {}

  async execute(dto: UploadDocumentInput): Promise<DocumentData> {
    const document = await this.uploadDocument.execute(dto)
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
