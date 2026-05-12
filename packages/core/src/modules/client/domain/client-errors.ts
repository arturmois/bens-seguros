export class ClientNotFoundError extends Error {
  readonly code = 'CLIENT_NOT_FOUND' as const
  constructor(id: string) {
    super(`Cliente ${id} não encontrado`)
    this.name = 'ClientNotFoundError'
  }
}

export class ClientAlreadyExistsError extends Error {
  readonly code = 'CLIENT_ALREADY_EXISTS' as const
  readonly details: { readonly existingClientId: string }
  constructor(existingClientId: string) {
    super('Já existe cliente com este documento na organização')
    this.name = 'ClientAlreadyExistsError'
    this.details = { existingClientId }
  }
}

export const ClientErrors = {
  notFound: (id: string) => new ClientNotFoundError(id),
  alreadyExists: (existingClientId: string) =>
    new ClientAlreadyExistsError(existingClientId),
}
