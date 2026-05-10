import type {
  ChecklistItemData,
  ChecklistRepository,
} from '../domain/checklist-repository.js'
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
    await this.proposalRepo.findByIdOrFail(proposalId, organizationId)
    return this.checklistRepo.complete(itemId, proposalId, userId)
  }
}
