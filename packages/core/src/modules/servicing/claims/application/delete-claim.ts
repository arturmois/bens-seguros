import { injectable, inject } from 'tsyringe'
import type { ClaimRepository } from '../domain/claim-repository.js'
import { ClaimErrors } from '../domain/claim-errors.js'

@injectable()
export class DeleteClaim {
  constructor(
    @inject('ClaimRepository') private readonly claimRepo: ClaimRepository
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const existing = await this.claimRepo.findById(id, organizationId)
    if (!existing) {
      throw ClaimErrors.notFound(id)
    }
    await this.claimRepo.softDelete(id, organizationId)
  }
}
