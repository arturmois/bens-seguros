import { inject, injectable } from 'tsyringe'
import type { ContactRepository } from '../../contact/domain/contact-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { Proposal } from '../domain/proposal.js'

@injectable()
export class AdvanceProposalStage {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository,
    @inject('ChecklistRepository')
    private readonly checklistRepo: ChecklistRepository,
    @inject('ChecklistConfigProvider')
    private readonly checklistConfig: ChecklistConfigProvider,
    @inject('ContactRepository')
    private readonly contactRepo: ContactRepository
  ) {}

  async execute(proposalId: string, organizationId: string): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) {
      throw ProposalErrors.notFound(proposalId)
    }
    if (proposal.needsDetailsToAdvance()) {
      throw ProposalErrors.detailsRequired(proposalId)
    }
    if (proposal.requiresChecklistToAdvance()) {
      const summary = await this.checklistRepo.getSummary(proposalId)
      if (!summary.canAdvance) {
        throw ProposalErrors.checklistIncomplete(
          proposalId,
          summary.required - summary.requiredCompleted
        )
      }
    }
    if (proposal.requiresPromotedContact()) {
      await this.assertContactIsPromoted(proposal.contactId, organizationId)
    }
    proposal.advance()
    await this.proposalRepo.save(proposal)
    if (proposal.acceptsNewChecklistItems()) {
      const newItems = this.checklistConfig.getItems(
        proposal.stage,
        proposal.branch
      )
      if (newItems.length > 0) {
        await this.checklistRepo.createMany(
          proposalId,
          organizationId,
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

  private async assertContactIsPromoted(
    contactId: string,
    organizationId: string
  ): Promise<void> {
    const contact = await this.contactRepo.findById(contactId, organizationId)
    if (!contact?.clientId) {
      throw ProposalErrors.contactNotPromoted()
    }
  }
}
