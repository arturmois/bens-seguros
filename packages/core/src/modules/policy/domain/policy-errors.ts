export class PolicyNotFoundError extends Error {
  readonly code = 'POLICY_NOT_FOUND' as const
  constructor(id: string) {
    super(`Apólice ${id} não encontrada`)
    this.name = 'PolicyNotFoundError'
  }
}

export class PolicyAlreadyCancelledError extends Error {
  readonly code = 'POLICY_ALREADY_CANCELLED' as const
  constructor(id: string) {
    super(`Apólice ${id} já está cancelada`)
    this.name = 'PolicyAlreadyCancelledError'
  }
}

export class PolicyNotIssuableError extends Error {
  readonly code = 'POLICY_NOT_ISSUABLE' as const
  constructor(proposalId: string) {
    super(`Proposta ${proposalId} não está no estágio POLICY_ISSUED`)
    this.name = 'PolicyNotIssuableError'
  }
}

export class DuplicatePolicyError extends Error {
  readonly code = 'DUPLICATE_POLICY' as const
  constructor(policyNumber: string) {
    super(`Número de apólice ${policyNumber} já está em uso`)
    this.name = 'DuplicatePolicyError'
  }
}

export class PolicyMissingInsurerError extends Error {
  readonly code = 'POLICY_MISSING_INSURER' as const
  constructor(proposalId: string) {
    super(
      `Proposta ${proposalId} não possui seguradora definida — selecione uma para emitir a apólice`
    )
    this.name = 'PolicyMissingInsurerError'
  }
}

export const PolicyErrors = {
  notFound: (id: string) => new PolicyNotFoundError(id),
  alreadyCancelled: (id: string) => new PolicyAlreadyCancelledError(id),
  notIssuable: (proposalId: string) => new PolicyNotIssuableError(proposalId),
  duplicatePolicy: (policyNumber: string) =>
    new DuplicatePolicyError(policyNumber),
  missingInsurer: (proposalId: string) =>
    new PolicyMissingInsurerError(proposalId),
}
