export class PolicyNotFoundError extends Error {
  readonly code = 'POLICY_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Apólice ${id} não encontrada`);
    this.name = 'PolicyNotFoundError';
  }
}

export class PolicyAlreadyCancelledError extends Error {
  readonly code = 'POLICY_ALREADY_CANCELLED' as const;
  constructor(id: string) {
    super(`Apólice ${id} já está cancelada`);
    this.name = 'PolicyAlreadyCancelledError';
  }
}

export class PolicyNotIssuableError extends Error {
  readonly code = 'POLICY_NOT_ISSUABLE' as const;
  constructor(proposalId: string) {
    super(`Proposta ${proposalId} não está no estágio POLICY_ISSUED`);
    this.name = 'PolicyNotIssuableError';
  }
}

export const PolicyErrors = {
  notFound: (id: string) => new PolicyNotFoundError(id),
  alreadyCancelled: (id: string) => new PolicyAlreadyCancelledError(id),
  notIssuable: (proposalId: string) => new PolicyNotIssuableError(proposalId),
};
