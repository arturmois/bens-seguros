import { injectable, inject } from 'tsyringe';
import type { ClaimRepository, ClaimData } from '../domain/claim-repository.js';
import { ClaimErrors } from '../domain/claim-errors.js';

@injectable()
export class GetClaim {
  constructor(@inject('ClaimRepository') private readonly claimRepo: ClaimRepository) {}

  async execute(id: string, organizationId: string): Promise<ClaimData> {
    const claim = await this.claimRepo.findById(id, organizationId);
    if (!claim) {
      throw ClaimErrors.notFound(id);
    }
    return claim;
  }
}
