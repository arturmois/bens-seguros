import { injectable, inject } from 'tsyringe'
import type {
  ClientRepository,
  ClientData,
  CreateClientInput,
} from '../domain/client-repository.js'
import { ClientErrors } from '../domain/client-errors.js'

@injectable()
export class CreateClient {
  constructor(
    @inject('ClientRepository') private readonly clientRepo: ClientRepository
  ) {}

  async execute(dto: CreateClientInput): Promise<ClientData> {
    const existing = await this.clientRepo.findByDocument(
      dto.document,
      dto.organizationId
    )
    if (existing) {
      throw ClientErrors.alreadyExists(dto.document)
    }

    return this.clientRepo.create(dto)
  }
}
