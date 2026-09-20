import type { ProposalRepository } from '../domain/proposal-repository.js'

export interface FindStagnantProposalsInput {
  organizationId: string
  now: Date
  days: number
}

export interface StagnantProposal {
  id: string
  salespersonId: string
  stage: string
  updatedAt: Date
  clientName: string
}

export class FindStagnantProposals {
  constructor(
    private readonly proposalRepo: Pick<ProposalRepository, 'findStagnant'>
  ) {}

  async execute(
    input: FindStagnantProposalsInput
  ): Promise<StagnantProposal[]> {
    const updatedBefore = new Date(input.now)
    updatedBefore.setDate(updatedBefore.getDate() - input.days)
    return this.proposalRepo.findStagnant({
      organizationId: input.organizationId,
      updatedBefore,
    })
  }
}
