import { injectable, inject } from 'tsyringe'
import type { ClientRepository } from '../domain/client-repository.js'
import { ClientErrors } from '../domain/client-errors.js'

@injectable()
export class DeleteClient {
  constructor(
    @inject('ClientRepository') private readonly clientRepo: ClientRepository
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const existing = await this.clientRepo.findById(id, organizationId)
    if (!existing) {
      throw ClientErrors.notFound(id)
    }
    await this.clientRepo.softDelete(id, organizationId)
  }
}
