import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { Stage, Branch } from '../domain/proposal.js'

export class InitializeChecklist {
  constructor(
    private readonly checklistRepo: ChecklistRepository,
    private readonly checklistConfig: ChecklistConfigProvider
  ) {}

  async execute(
    proposalId: string,
    stage: Stage,
    branch: Branch
  ): Promise<void> {
    const items = this.checklistConfig.getItems(stage, branch)
    if (items.length === 0) return
    await this.checklistRepo.createMany(
      proposalId,
      items.map((i) => ({
        itemKey: i.itemKey,
        label: i.label,
        isRequired: i.isRequired,
      }))
    )
  }
}
