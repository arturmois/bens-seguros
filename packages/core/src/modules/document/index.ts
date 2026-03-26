// Domain
export type {
  DocumentEntityType,
  DocumentType,
  DocumentData,
  DocumentFilters,
  DocumentRepository,
  CreateDocumentInput,
} from './domain/document-repository.js'
export type {
  StorageProvider,
  UploadResult,
} from './domain/storage-provider.js'
export {
  DocumentNotFoundError,
  InvalidFileTypeError,
  DocumentErrors,
} from './domain/document-errors.js'

// Application
export { UploadDocument } from './application/upload-document.js'
export { ListDocuments } from './application/list-documents.js'
export { GetDocumentUrl } from './application/get-document-url.js'
export { DeleteDocument } from './application/delete-document.js'

// Infrastructure
export { DocumentMapper } from './infrastructure/document-mapper.js'
export { PrismaDocumentRepository } from './infrastructure/prisma-document-repository.js'
export { R2StorageProvider } from './infrastructure/r2-storage-provider.js'
export { LocalStorageProvider } from './infrastructure/local-storage-provider.js'
