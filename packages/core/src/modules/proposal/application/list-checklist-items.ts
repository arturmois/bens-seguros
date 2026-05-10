import type {
  ChecklistItemData,
  ChecklistRepository,
  ChecklistSummary,
} from '../domain/checklist-repository.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'

export class ListChecklistItems {
  constructor(
    private readonly checklistRepo: ChecklistRepository,
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(
    proposalId: string,
    organizationId: string
  ): Promise<{
    items: ChecklistItemData[]
    summary: ChecklistSummary
  }> {
    await this.proposalRepo.findByIdOrFail(proposalId, organizationId)
    const [items, summary] = await Promise.all([
      this.checklistRepo.findByProposal(proposalId),
      this.checklistRepo.getSummary(proposalId),
    ])
    return { items, summary }
  }
}
