import { inject, injectable } from 'tsyringe'
import type {
  ChecklistItemData,
  ChecklistRepository,
} from '../domain/checklist-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'

@injectable()
export class UncompleteChecklistItem {
  constructor(
    @inject('ChecklistRepository')
    private readonly checklistRepo: ChecklistRepository,
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(
    itemId: string,
    proposalId: string,
    organizationId: string
  ): Promise<ChecklistItemData> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) {
      throw ProposalErrors.notFound(proposalId)
    }
    return this.checklistRepo.uncomplete(itemId, proposalId)
  }
}
