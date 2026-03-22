import { injectable, inject } from 'tsyringe'
import type {
  DocumentRepository,
  DocumentData,
  DocumentEntityType,
} from '../domain/document-repository.js'

@injectable()
export class ListDocuments {
  constructor(
    @inject('DocumentRepository')
    private readonly documentRepo: DocumentRepository
  ) {}

  async execute(
    entityType: DocumentEntityType,
    entityId: string,
    organizationId: string
  ): Promise<DocumentData[]> {
    return this.documentRepo.findByEntity(entityType, entityId, organizationId)
  }
}
