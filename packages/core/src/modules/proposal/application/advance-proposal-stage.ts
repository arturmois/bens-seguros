import { injectable, inject } from 'tsyringe'
import type { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import { ProposalErrors } from '../domain/proposal-errors.js'

@injectable()
export class AdvanceProposalStage {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository,
    @inject('ChecklistRepository')
    private readonly checklistRepo: ChecklistRepository,
    @inject('ChecklistConfigProvider')
    private readonly checklistConfig: ChecklistConfigProvider
  ) {}

  async execute(proposalId: string, organizationId: string): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) {
      throw ProposalErrors.notFound(proposalId)
    }

    if (proposal.stage === 'QUOTE' && !proposal.details) {
      throw ProposalErrors.detailsRequired(proposalId)
    }

    if (proposal.stage !== 'CAPTURE') {
      const summary = await this.checklistRepo.getSummary(proposalId)
      if (!summary.canAdvance) {
        throw ProposalErrors.checklistIncomplete(
          proposalId,
          summary.required - summary.requiredCompleted
        )
      }
    }

    proposal.advance()
    await this.proposalRepo.save(proposal)

    if (proposal.stage !== 'POLICY_ISSUED' && proposal.stage !== 'LOST') {
      const newItems = this.checklistConfig.getItems(
        proposal.stage,
        proposal.branch
      )
      if (newItems.length > 0) {
        await this.checklistRepo.createMany(
          proposalId,
          newItems.map((i) => ({
            itemKey: i.itemKey,
            label: i.label,
            isRequired: i.isRequired,
          }))
        )
      }
    }

    return proposal
  }
}
