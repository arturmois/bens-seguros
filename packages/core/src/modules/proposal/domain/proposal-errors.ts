export class ProposalNotFoundError extends Error {
  readonly code = 'PROPOSAL_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Proposta ${id} não encontrada`);
    this.name = 'ProposalNotFoundError';
  }
}

export class InvalidStageTransitionError extends Error {
  readonly code = 'INVALID_STAGE_TRANSITION' as const;
  constructor(from: string, action: string) {
    super(`Não é possível ${action} a partir do estágio ${from}`);
    this.name = 'InvalidStageTransitionError';
  }
}

export class ProposalDetailsRequiredError extends Error {
  readonly code = 'PROPOSAL_DETAILS_REQUIRED' as const;
  constructor(id: string) {
    super(`Preencha os dados do objeto segurado antes de avançar (proposta ${id})`);
    this.name = 'ProposalDetailsRequiredError';
  }
}

export const ProposalErrors = {
  notFound: (id: string) => new ProposalNotFoundError(id),
  invalidTransition: (from: string, action: string) =>
    new InvalidStageTransitionError(from, action),
  detailsRequired: (id: string) => new ProposalDetailsRequiredError(id),
};
