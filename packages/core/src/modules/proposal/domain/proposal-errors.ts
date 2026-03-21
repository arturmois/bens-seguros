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

export const ProposalErrors = {
  notFound: (id: string) => new ProposalNotFoundError(id),
  invalidTransition: (from: string, action: string) =>
    new InvalidStageTransitionError(from, action),
};
