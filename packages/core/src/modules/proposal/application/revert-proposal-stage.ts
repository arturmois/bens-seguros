import { injectable, inject } from 'tsyringe';
import type { Proposal } from '../domain/proposal.js';
import type { ProposalRepository } from '../domain/proposal-repository.js';
import { ProposalErrors } from '../domain/proposal-errors.js';

@injectable()
export class RevertProposalStage {
  constructor(@inject('ProposalRepository') private readonly proposalRepo: ProposalRepository) {}

  async execute(proposalId: string, organizationId: string): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(proposalId, organizationId);
    if (!proposal) {
      throw ProposalErrors.notFound(proposalId);
    }

    proposal.revert();
    await this.proposalRepo.save(proposal);

    return proposal;
  }
}
