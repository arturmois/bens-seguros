export class ContactNotFoundError extends Error {
  readonly code = 'CONTACT_NOT_FOUND' as const
  constructor(id: string) {
    super(`Contato ${id} não encontrado`)
    this.name = 'ContactNotFoundError'
  }
}

export class ContactInvalidError extends Error {
  readonly code = 'CONTACT_INVALID' as const
  constructor(reason: string) {
    super(reason)
    this.name = 'ContactInvalidError'
  }
}

export class DocumentMismatchError extends Error {
  readonly code = 'DOCUMENT_MISMATCH' as const
  constructor() {
    super(
      'O documento informado não corresponde ao cliente já vinculado a este contato'
    )
    this.name = 'DocumentMismatchError'
  }
}

export const ContactErrors = {
  notFound: (id: string) => new ContactNotFoundError(id),
  invalid: (reason: string) => new ContactInvalidError(reason),
  documentMismatch: () => new DocumentMismatchError(),
}
