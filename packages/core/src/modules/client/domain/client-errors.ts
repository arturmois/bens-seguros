export class ClientNotFoundError extends Error {
  readonly code = 'CLIENT_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Cliente ${id} não encontrado`);
    this.name = 'ClientNotFoundError';
  }
}

export class ClientAlreadyExistsError extends Error {
  readonly code = 'CLIENT_ALREADY_EXISTS' as const;
  constructor(document: string) {
    super(`CPF/CNPJ ${document} já cadastrado nesta organização`);
    this.name = 'ClientAlreadyExistsError';
  }
}

export const ClientErrors = {
  notFound: (id: string) => new ClientNotFoundError(id),
  alreadyExists: (doc: string) => new ClientAlreadyExistsError(doc),
};
