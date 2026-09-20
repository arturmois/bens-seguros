import pino from 'pino'
import { inject, injectable } from 'tsyringe'
import type { ContactRepository } from '../../leads/domain/contact-repository.js' // ContactRepository lives in sales/leads;
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { Proposal } from '../domain/proposal.js'
import { AutoCompleteChecklistItems } from './auto-complete-checklist-items.js'
import { syncStageChecklist } from './sync-stage-checklist.js'

const logger = pino({ name: 'advance-proposal-stage' })

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
    private readonly contactRepo: ContactRepository,
    @inject(AutoCompleteChecklistItems)
    private readonly autoComplete: AutoCompleteChecklistItems
  ) {}

  async execute(proposalId: string, organizationId: string): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) {
      throw ProposalErrors.notFound(proposalId)
    }
    await this.assertCanAdvance(proposal, organizationId)
    proposal.advance()
    await this.proposalRepo.save(proposal)
    await this.regenerateChecklistIfNeeded(proposal, organizationId)
    return proposal
  }

  private async assertCanAdvance(
    proposal: Proposal,
    organizationId: string
  ): Promise<void> {
    if (proposal.needsDetailsToAdvance()) {
      throw ProposalErrors.detailsRequired(proposal.id)
    }
    if (proposal.requiresChecklistToAdvance()) {
      await this.assertChecklistComplete(proposal.id)
    }
    if (proposal.requiresPromotedContact()) {
      await this.assertContactIsPromoted(proposal.contactId, organizationId)
    }
  }

  private async assertChecklistComplete(proposalId: string): Promise<void> {
    const summary = await this.checklistRepo.getSummary(proposalId)
    if (summary.canAdvance) {
      return
    }
    throw ProposalErrors.checklistIncomplete(
      proposalId,
      summary.required - summary.requiredCompleted
    )
  }

  private async regenerateChecklistIfNeeded(
    proposal: Proposal,
    organizationId: string
  ): Promise<void> {
    if (!proposal.acceptsNewChecklistItems()) return
    const newItems = this.checklistConfig.getItems(
      proposal.stage,
      proposal.branch
    )
    await syncStageChecklist({
      proposalId: proposal.id,
      organizationId,
      items: newItems,
      checklistRepo: this.checklistRepo,
      autoComplete: this.autoComplete,
      onAutoDetectError: (error, itemKey) => {
        logger.warn(
          { err: error, proposalId: proposal.id, itemKey },
          'Auto-detect falhou após regeneração de checklist'
        )
      },
    })
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
