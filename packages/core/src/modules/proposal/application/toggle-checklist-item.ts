import type {
  ChecklistRepository,
  ChecklistItemData,
} from '../domain/checklist-repository.js'

export class ToggleChecklistItem {
  constructor(private readonly checklistRepo: ChecklistRepository) {}

  async execute(
    itemId: string,
    proposalId: string,
    userId: string
  ): Promise<ChecklistItemData> {
    return this.checklistRepo.toggle(itemId, proposalId, userId)
  }
}
