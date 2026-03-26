export class DocumentNotFoundError extends Error {
  readonly code = 'DOCUMENT_NOT_FOUND' as const
  constructor(id: string) {
    super(`Documento ${id} não encontrado`)
    this.name = 'DocumentNotFoundError'
  }
}

export class InvalidFileTypeError extends Error {
  readonly code = 'INVALID_FILE_TYPE' as const
  constructor(detectedType: string) {
    super(`Tipo de arquivo não permitido: ${detectedType}`)
    this.name = 'InvalidFileTypeError'
  }
}

export const DocumentErrors = {
  notFound: (id: string) => new DocumentNotFoundError(id),
  invalidFileType: (type: string) => new InvalidFileTypeError(type),
}
