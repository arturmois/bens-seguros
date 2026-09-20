import type { ChecklistItemConfig } from '../domain/checklist-config.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type {
  AutoCompleteChecklistItems,
  AutoCompleteItemKey,
} from './auto-complete-checklist-items.js'

const AUTO_DETECT_KEYS: readonly AutoCompleteItemKey[] = [
  'client_data',
  'driver_license',
  'vehicle_registration',
]

export interface SyncStageChecklistInput {
  readonly proposalId: string
  readonly organizationId: string
  readonly items: readonly ChecklistItemConfig[]
  readonly checklistRepo: ChecklistRepository
  readonly autoComplete: Pick<AutoCompleteChecklistItems, 'execute'>
  readonly onAutoDetectError: (
    error: unknown,
    itemKey: AutoCompleteItemKey
  ) => void
}

export async function syncStageChecklist(
  input: SyncStageChecklistInput
): Promise<void> {
  if (input.items.length === 0) {
    return
  }
  await input.checklistRepo.createMany(
    input.proposalId,
    input.organizationId,
    input.items.map((item) => ({
      itemKey: item.itemKey,
      label: item.label,
      isRequired: item.isRequired,
    }))
  )
  for (const itemKey of AUTO_DETECT_KEYS) {
    try {
      await input.autoComplete.execute({
        organizationId: input.organizationId,
        proposalId: input.proposalId,
        itemKey,
      })
    } catch (error) {
      input.onAutoDetectError(error, itemKey)
    }
  }
}
