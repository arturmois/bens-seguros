export class InsurerNotFoundError extends Error {
  readonly code = 'INSURER_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Seguradora ${id} não encontrada`);
    this.name = 'InsurerNotFoundError';
  }
}

export class InsurerAlreadyExistsError extends Error {
  readonly code = 'INSURER_ALREADY_EXISTS' as const;
  constructor(name: string) {
    super(`Seguradora "${name}" já cadastrada nesta organização`);
    this.name = 'InsurerAlreadyExistsError';
  }
}

export const InsurerErrors = {
  notFound: (id: string) => new InsurerNotFoundError(id),
  alreadyExists: (name: string) => new InsurerAlreadyExistsError(name),
};
