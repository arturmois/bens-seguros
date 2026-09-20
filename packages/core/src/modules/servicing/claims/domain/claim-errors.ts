export class ClaimNotFoundError extends Error {
  readonly code = 'CLAIM_NOT_FOUND' as const
  constructor(id: string) {
    super(`Sinistro ${id} não encontrado`)
    this.name = 'ClaimNotFoundError'
  }
}

export class InvalidClaimStatusTransitionError extends Error {
  readonly code = 'INVALID_CLAIM_STATUS_TRANSITION' as const
  constructor(from: string, to: string) {
    super(`Transição de status inválida: ${from} -> ${to}`)
    this.name = 'InvalidClaimStatusTransitionError'
  }
}

export const ClaimErrors = {
  notFound: (id: string) => new ClaimNotFoundError(id),
  invalidTransition: (from: string, to: string) =>
    new InvalidClaimStatusTransitionError(from, to),
}
