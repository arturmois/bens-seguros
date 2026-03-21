export class EndorsementNotFoundError extends Error {
  readonly code = 'ENDORSEMENT_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Endosso ${id} não encontrado`);
    this.name = 'EndorsementNotFoundError';
  }
}

export const EndorsementErrors = {
  notFound: (id: string) => new EndorsementNotFoundError(id),
};
