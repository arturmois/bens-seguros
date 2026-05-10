import { inject, injectable } from 'tsyringe'
import type { ProposalRepository } from '../domain/proposal-repository.js'

@injectable()
export class ReopenProposal {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(proposalId: string, organizationId: string): Promise<void> {
    const proposal = await this.proposalRepo.findByIdOrFail(
      proposalId,
      organizationId
    )
    proposal.reopenFromLost()
    await this.proposalRepo.save(proposal)
  }
}
