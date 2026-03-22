import type {
  ChecklistRepository,
  ChecklistItemData,
} from '../domain/checklist-repository.js'

export class CompleteChecklistByAttachment {
  constructor(private readonly checklistRepo: ChecklistRepository) {}

  async execute(
    itemId: string,
    proposalId: string,
    userId: string
  ): Promise<ChecklistItemData> {
    return this.checklistRepo.complete(itemId, proposalId, userId)
  }
}
