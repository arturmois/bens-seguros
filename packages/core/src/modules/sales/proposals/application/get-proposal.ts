import { injectable, inject } from 'tsyringe'
import type { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'

@injectable()
export class GetProposal {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(id: string, organizationId: string): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(id, organizationId)
    if (!proposal) {
      throw ProposalErrors.notFound(id)
    }
    return proposal
  }
}
