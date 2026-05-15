import pino from 'pino'
import { inject, injectable } from 'tsyringe'
import type { ContactRepository } from '../../contact/domain/contact-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { Proposal } from '../domain/proposal.js'
import { AutoCompleteChecklistItems } from './auto-complete-checklist-items.js'

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
    if (newItems.length === 0) return
    await this.checklistRepo.createMany(
      proposal.id,
      organizationId,
      newItems.map((i) => ({
        itemKey: i.itemKey,
        label: i.label,
        isRequired: i.isRequired,
      }))
    )
    await this.runAutoDetection(proposal)
  }

  private async runAutoDetection(proposal: Proposal): Promise<void> {
    const autoKeys = [
      'client_data',
      'driver_license',
      'vehicle_registration',
    ] as const
    for (const itemKey of autoKeys) {
      try {
        await this.autoComplete.execute({
          organizationId: proposal.organizationId,
          proposalId: proposal.id,
          itemKey,
        })
      } catch (error) {
        logger.warn(
          { err: error, proposalId: proposal.id, itemKey },
          'Auto-detect falhou após regeneração de checklist'
        )
      }
    }
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
