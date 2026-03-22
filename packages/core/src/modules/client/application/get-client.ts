import { injectable, inject } from 'tsyringe'
import type {
  ClientRepository,
  ClientData,
} from '../domain/client-repository.js'
import { ClientErrors } from '../domain/client-errors.js'

@injectable()
export class GetClient {
  constructor(
    @inject('ClientRepository') private readonly clientRepo: ClientRepository
  ) {}

  async execute(id: string, organizationId: string): Promise<ClientData> {
    const client = await this.clientRepo.findById(id, organizationId)
    if (!client) {
      throw ClientErrors.notFound(id)
    }
    return client
  }
}
