export class ProposalNotFoundError extends Error {
  readonly code = 'PROPOSAL_NOT_FOUND' as const
  constructor(id: string) {
    super(`Proposta ${id} não encontrada`)
    this.name = 'ProposalNotFoundError'
  }
}

export class InvalidStageTransitionError extends Error {
  readonly code = 'INVALID_STAGE_TRANSITION' as const
  constructor(from: string, action: string) {
    super(`Não é possível ${action} a partir do estágio ${from}`)
    this.name = 'InvalidStageTransitionError'
  }
}

export class ProposalDetailsRequiredError extends Error {
  readonly code = 'PROPOSAL_DETAILS_REQUIRED' as const
  constructor(id: string) {
    super(
      `Preencha os dados do objeto segurado antes de avançar (proposta ${id})`
    )
    this.name = 'ProposalDetailsRequiredError'
  }
}

export class BranchMismatchError extends Error {
  readonly code = 'BRANCH_MISMATCH' as const
  constructor(expected: string, received: string) {
    super(
      `Ramo dos detalhes (${received}) não corresponde ao ramo da proposta (${expected})`
    )
    this.name = 'BranchMismatchError'
  }
}

export class ChecklistIncompleteError extends Error {
  readonly code = 'CHECKLIST_INCOMPLETE' as const
  constructor(proposalId: string, pendingCount: number) {
    super(
      `Checklist incompleto: ${pendingCount} itens obrigatórios pendentes (proposta ${proposalId})`
    )
    this.name = 'ChecklistIncompleteError'
  }
}

export class SourcePolicyRequiredForEndorsementError extends Error {
  readonly code = 'SOURCE_POLICY_REQUIRED_FOR_ENDORSEMENT' as const
  constructor() {
    super('Endosso exige uma apólice de origem')
    this.name = 'SourcePolicyRequiredForEndorsementError'
  }
}

export class SourcePolicyNotEligibleError extends Error {
  readonly code = 'SOURCE_POLICY_NOT_ELIGIBLE' as const
  constructor(policyId: string) {
    super(`A apólice de origem precisa estar em vigor (${policyId})`)
    this.name = 'SourcePolicyNotEligibleError'
  }
}

export class InvalidCoverageDatesError extends Error {
  readonly code = 'INVALID_COVERAGE_DATES' as const
  constructor() {
    super('Data de fim deve ser posterior à data de início')
    this.name = 'InvalidCoverageDatesError'
  }
}

export class ClientHasNoEmailError extends Error {
  readonly code = 'CLIENT_NO_EMAIL' as const
  constructor() {
    super('Cliente não possui e-mail cadastrado')
    this.name = 'ClientHasNoEmailError'
  }
}

export class CannotSendQuoteForLostProposalError extends Error {
  readonly code = 'CANNOT_SEND_LOST_QUOTE' as const
  constructor() {
    super('Não é possível enviar cotação para proposta perdida')
    this.name = 'CannotSendQuoteForLostProposalError'
  }
}

export const ProposalErrors = {
  notFound: (id: string) => new ProposalNotFoundError(id),
  invalidTransition: (from: string, action: string) =>
    new InvalidStageTransitionError(from, action),
  detailsRequired: (id: string) => new ProposalDetailsRequiredError(id),
  branchMismatch: (expected: string, received: string) =>
    new BranchMismatchError(expected, received),
  checklistIncomplete: (id: string, pending: number) =>
    new ChecklistIncompleteError(id, pending),
  sourcePolicyRequiredForEndorsement: () =>
    new SourcePolicyRequiredForEndorsementError(),
  sourcePolicyNotEligible: (id: string) => new SourcePolicyNotEligibleError(id),
  invalidCoverageDates: () => new InvalidCoverageDatesError(),
  clientHasNoEmail: () => new ClientHasNoEmailError(),
  cannotSendQuoteForLostProposal: () =>
    new CannotSendQuoteForLostProposalError(),
}
