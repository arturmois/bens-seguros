export class ClientNotFoundError extends Error {
  readonly code = 'CLIENT_NOT_FOUND' as const
  constructor(id: string) {
    super(`Cliente ${id} não encontrado`)
    this.name = 'ClientNotFoundError'
  }
}

export class ClientAlreadyExistsError extends Error {
  readonly code = 'CLIENT_ALREADY_EXISTS' as const
  constructor() {
    super('Já existe cliente com este documento na organização')
    this.name = 'ClientAlreadyExistsError'
  }
}

export const ClientErrors = {
  notFound: (id: string) => new ClientNotFoundError(id),
  alreadyExists: () => new ClientAlreadyExistsError(),
}
