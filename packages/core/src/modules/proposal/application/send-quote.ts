import { inject, injectable } from 'tsyringe'
import { ProposalErrors } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { Proposal } from '../domain/proposal.js'

@injectable()
export class SendQuote {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async validate(
    proposalId: string,
    organizationId: string,
    clientEmail: string | null
  ): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) {
      throw ProposalErrors.notFound(proposalId)
    }
    if (!clientEmail) {
      throw ProposalErrors.clientHasNoEmail()
    }
    if (proposal.isLost()) {
      throw ProposalErrors.cannotSendQuoteForLostProposal()
    }
    return proposal
  }
}
