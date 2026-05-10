import { inject, injectable } from 'tsyringe'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { Proposal } from '../domain/proposal.js'

@injectable()
export class MarkProposalLost {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(
    proposalId: string,
    organizationId: string,
    reason: string
  ): Promise<Proposal> {
    const proposal = await this.proposalRepo.findByIdOrFail(
      proposalId,
      organizationId
    )
    proposal.markAsLost(reason)
    await this.proposalRepo.save(proposal)
    return proposal
  }
}
