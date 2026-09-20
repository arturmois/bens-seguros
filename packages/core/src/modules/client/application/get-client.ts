import { ClientErrors } from '../domain/client-errors.js'
import type {
  ClientRepository,
  ClientWithMetrics,
} from '../domain/client-repository.js'

export interface GetClientInput {
  id: string
  organizationId: string
}

export class GetClient {
  constructor(private readonly clientRepo: ClientRepository) {}

  async execute(input: GetClientInput): Promise<ClientWithMetrics> {
    const found = await this.clientRepo.findByIdWithMetrics(
      input.id,
      input.organizationId
    )
    if (!found) {
      throw ClientErrors.notFound(input.id)
    }
    return found
  }
}
