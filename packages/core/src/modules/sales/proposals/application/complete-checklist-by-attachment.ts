import type {
  ChecklistItemData,
  ChecklistRepository,
} from '../domain/checklist-repository.js'
import { ProposalNotFoundError } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'

export class CompleteChecklistByAttachment {
  constructor(
    private readonly checklistRepo: ChecklistRepository,
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(
    itemId: string,
    proposalId: string,
    organizationId: string,
    userId: string
  ): Promise<ChecklistItemData> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) {
      throw new ProposalNotFoundError(proposalId)
    }
    return this.checklistRepo.complete(itemId, proposalId, userId)
  }
}
