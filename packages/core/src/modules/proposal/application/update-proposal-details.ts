import { injectable, inject } from 'tsyringe'
import type { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { InsuredObjectDetails } from '../domain/insured-object-details.js'
import { ProposalErrors } from '../domain/proposal-errors.js'

interface UpdateProposalDetailsDTO {
  details: InsuredObjectDetails
  premiumValueInCents: number
  commissionBasisPoints: number
  insurerId?: string | null
}

@injectable()
export class UpdateProposalDetails {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(
    proposalId: string,
    organizationId: string,
    dto: UpdateProposalDetailsDTO
  ): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) throw ProposalErrors.notFound(proposalId)
    if (proposal.stage === 'LOST') {
      throw ProposalErrors.invalidTransition('LOST', 'editar detalhes')
    }
    proposal.updateDetails(
      dto.details,
      dto.premiumValueInCents,
      dto.commissionBasisPoints,
      dto.insurerId
    )
    await this.proposalRepo.save(proposal)
    return proposal
  }
}
