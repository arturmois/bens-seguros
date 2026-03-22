export interface ChecklistItemData {
  readonly id: string
  readonly proposalId: string
  readonly itemKey: string
  readonly label: string
  readonly isRequired: boolean
  readonly isCompleted: boolean
  readonly completedAt: Date | null
  readonly completedBy: string | null
  readonly createdAt: Date
}

export interface ChecklistSummary {
  readonly total: number
  readonly completed: number
  readonly required: number
  readonly requiredCompleted: number
  readonly canAdvance: boolean
}

export interface ChecklistRepository {
  createMany(
    proposalId: string,
    items: Array<{ itemKey: string; label: string; isRequired: boolean }>
  ): Promise<void>
  findByProposal(proposalId: string): Promise<ChecklistItemData[]>
  findById(id: string, proposalId: string): Promise<ChecklistItemData | null>
  toggle(
    id: string,
    proposalId: string,
    userId: string
  ): Promise<ChecklistItemData>
  complete(
    id: string,
    proposalId: string,
    userId: string
  ): Promise<ChecklistItemData>
  getSummary(proposalId: string): Promise<ChecklistSummary>
}
