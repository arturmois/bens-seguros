export class CommissionNotFoundError extends Error {
  readonly code = 'COMMISSION_NOT_FOUND' as const
  constructor(id: string) {
    super(`Comissão ${id} não encontrada`)
    this.name = 'CommissionNotFoundError'
  }
}

export class InvalidCommissionTransitionError extends Error {
  readonly code = 'INVALID_COMMISSION_TRANSITION' as const
  constructor(from: string, action: string) {
    super(`Não é possível ${action} a partir do status ${from}`)
    this.name = 'InvalidCommissionTransitionError'
  }
}

export class CommissionNotPaidError extends Error {
  readonly code = 'COMMISSION_NOT_PAID' as const
  constructor(id: string) {
    super(`Comissão ${id} não está paga — não é possível estornar`)
    this.name = 'CommissionNotPaidError'
  }
}

export class CommissionAlreadyPaidError extends Error {
  readonly code = 'COMMISSION_ALREADY_PAID' as const
  constructor(id: string) {
    super(`Comissão ${id} já foi paga`)
    this.name = 'CommissionAlreadyPaidError'
  }
}

export const CommissionErrors = {
  notFound: (id: string) => new CommissionNotFoundError(id),
  invalidTransition: (from: string, action: string) =>
    new InvalidCommissionTransitionError(from, action),
  notPaid: (id: string) => new CommissionNotPaidError(id),
  alreadyPaid: (id: string) => new CommissionAlreadyPaidError(id),
}
