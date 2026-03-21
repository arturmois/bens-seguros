import { injectable, inject } from 'tsyringe';
import type { Proposal } from '../domain/proposal.js';
import type { ProposalRepository } from '../domain/proposal-repository.js';
import { ProposalErrors } from '../domain/proposal-errors.js';

@injectable()
export class MarkProposalLost {
  constructor(@inject('ProposalRepository') private readonly proposalRepo: ProposalRepository) {}

  async execute(proposalId: string, organizationId: string, reason: string): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(proposalId, organizationId);
    if (!proposal) {
      throw ProposalErrors.notFound(proposalId);
    }

    proposal.markAsLost(reason);
    await this.proposalRepo.save(proposal);

    return proposal;
  }
}
