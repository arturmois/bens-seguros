import { inject, injectable } from 'tsyringe'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { Proposal } from '../domain/proposal.js'

interface UpdateProposalDatesDTO {
  coverageStartDate?: Date
  coverageEndDate?: Date
  clientResponseAt?: Date
  quoteValidUntil?: Date
}

@injectable()
export class UpdateProposalDates {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(
    proposalId: string,
    organizationId: string,
    dto: UpdateProposalDatesDTO
  ): Promise<Proposal> {
    const proposal = await this.proposalRepo.findByIdOrFail(
      proposalId,
      organizationId
    )
    this.applyCoverageDates(proposal, dto)
    if (dto.clientResponseAt !== undefined) {
      proposal.updateClientResponse(dto.clientResponseAt)
    }
    if (dto.quoteValidUntil !== undefined) {
      proposal.updateQuoteValidity(dto.quoteValidUntil)
    }
    await this.proposalRepo.save(proposal)
    return proposal
  }

  private applyCoverageDates(
    proposal: Proposal,
    dto: UpdateProposalDatesDTO
  ): void {
    const hasStart = dto.coverageStartDate !== undefined
    const hasEnd = dto.coverageEndDate !== undefined
    if (!hasStart && !hasEnd) {
      return
    }
    const start = dto.coverageStartDate ?? proposal.coverageStartDate
    const end = dto.coverageEndDate ?? proposal.coverageEndDate
    if (start && end) {
      proposal.updateCoverageDates(start, end)
    }
  }
}
