export class DocumentNotFoundError extends Error {
  readonly code = 'DOCUMENT_NOT_FOUND' as const
  constructor(id: string) {
    super(`Documento ${id} não encontrado`)
    this.name = 'DocumentNotFoundError'
  }
}

export const DocumentErrors = {
  notFound: (id: string) => new DocumentNotFoundError(id),
}
