export class AssistanceNotFoundError extends Error {
  readonly code = 'ASSISTANCE_NOT_FOUND' as const
  constructor(id: string) {
    super(`Assistência ${id} não encontrada`)
    this.name = 'AssistanceNotFoundError'
  }
}

export class InvalidAssistanceStatusTransitionError extends Error {
  readonly code = 'INVALID_ASSISTANCE_STATUS_TRANSITION' as const
  constructor(from: string, to: string) {
    super(`Transição de status inválida: ${from} -> ${to}`)
    this.name = 'InvalidAssistanceStatusTransitionError'
  }
}

export const AssistanceErrors = {
  notFound: (id: string) => new AssistanceNotFoundError(id),
  invalidTransition: (from: string, to: string) =>
    new InvalidAssistanceStatusTransitionError(from, to),
}
