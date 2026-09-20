export class InvalidCepError extends Error {
  readonly code = 'INVALID_CEP' as const
  constructor() {
    super('CEP inválido. Use 8 dígitos.')
    this.name = 'InvalidCepError'
  }
}

export class CepNotFoundError extends Error {
  readonly code = 'CEP_NOT_FOUND' as const
  constructor() {
    super('CEP não encontrado.')
    this.name = 'CepNotFoundError'
  }
}

export class CepProviderUnavailableError extends Error {
  readonly code = 'CEP_PROVIDER_UNAVAILABLE' as const
  constructor() {
    super('Serviço de CEP indisponível. Tente novamente.')
    this.name = 'CepProviderUnavailableError'
  }
}
