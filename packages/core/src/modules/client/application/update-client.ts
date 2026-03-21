import { injectable, inject } from 'tsyringe';
import type {
  ClientRepository,
  ClientData,
  UpdateClientInput,
} from '../domain/client-repository.js';
import { ClientErrors } from '../domain/client-errors.js';

@injectable()
export class UpdateClient {
  constructor(@inject('ClientRepository') private readonly clientRepo: ClientRepository) {}

  async execute(id: string, organizationId: string, data: UpdateClientInput): Promise<ClientData> {
    const existing = await this.clientRepo.findById(id, organizationId);
    if (!existing) {
      throw ClientErrors.notFound(id);
    }
    return this.clientRepo.update(id, organizationId, data);
  }
}
