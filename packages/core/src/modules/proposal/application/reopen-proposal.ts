import { injectable, inject } from 'tsyringe'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'

@injectable()
export class ReopenProposal {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(proposalId: string, organizationId: string): Promise<void> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) {
      throw ProposalErrors.notFound(proposalId)
    }
    proposal.reopenFromLost()
    await this.proposalRepo.save(proposal)
  }
}
