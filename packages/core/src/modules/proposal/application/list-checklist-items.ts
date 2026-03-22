import type {
  ChecklistRepository,
  ChecklistItemData,
  ChecklistSummary,
} from '../domain/checklist-repository.js'

export class ListChecklistItems {
  constructor(private readonly checklistRepo: ChecklistRepository) {}

  async execute(proposalId: string): Promise<{
    items: ChecklistItemData[]
    summary: ChecklistSummary
  }> {
    const [items, summary] = await Promise.all([
      this.checklistRepo.findByProposal(proposalId),
      this.checklistRepo.getSummary(proposalId),
    ])
    return { items, summary }
  }
}
