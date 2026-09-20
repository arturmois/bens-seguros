import type { ProposalRepository } from '../domain/proposal-repository.js'

export interface MarkQuoteSentInput {
  proposalId: string
  organizationId: string
  sentAt: Date
}

export class MarkQuoteSent {
  constructor(
    private readonly proposalRepo: Pick<ProposalRepository, 'markQuoteSent'>
  ) {}

  async execute(input: MarkQuoteSentInput): Promise<void> {
    await this.proposalRepo.markQuoteSent({
      proposalId: input.proposalId,
      organizationId: input.organizationId,
      sentToClientAt: input.sentAt,
    })
  }
}
