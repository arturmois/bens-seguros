export class AggilizadorError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'AggilizadorError'
    this.code = code
  }
}

export class AggilizadorApiError extends AggilizadorError {
  readonly statusCode: number
  readonly responseBody: unknown

  constructor(message: string, statusCode: number, responseBody: unknown) {
    super(message, 'AGGILIZADOR_API_ERROR')
    this.name = 'AggilizadorApiError'
    this.statusCode = statusCode
    this.responseBody = responseBody
  }
}

export class AggilizadorValidationError extends AggilizadorError {
  readonly fieldErrors: Record<string, string[]>

  constructor(message: string, fieldErrors: Record<string, string[]>) {
    super(message, 'AGGILIZADOR_VALIDATION_ERROR')
    this.name = 'AggilizadorValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class AggilizadorBusinessError extends AggilizadorError {
  readonly errorMessages: string[]

  constructor(message: string, errorMessages: string[]) {
    super(message, 'AGGILIZADOR_BUSINESS_ERROR')
    this.name = 'AggilizadorBusinessError'
    this.errorMessages = errorMessages
  }
}
