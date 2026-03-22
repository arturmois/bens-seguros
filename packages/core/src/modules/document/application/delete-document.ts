import { injectable, inject } from 'tsyringe'
import type { DocumentRepository } from '../domain/document-repository.js'
import type { StorageProvider } from '../domain/storage-provider.js'
import { DocumentErrors } from '../domain/document-errors.js'

@injectable()
export class DeleteDocument {
  constructor(
    @inject('DocumentRepository')
    private readonly documentRepo: DocumentRepository,
    @inject('StorageProvider') private readonly storage: StorageProvider
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const doc = await this.documentRepo.findById(id, organizationId)
    if (!doc) {
      throw DocumentErrors.notFound(id)
    }

    await this.documentRepo.delete(id, organizationId)
    await this.storage.delete(doc.storageKey)
  }
}
