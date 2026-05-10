import type { ProposalListPage } from './proposal-list-item.js'
import type { BoardType, Branch, Proposal, Stage } from './proposal.js'

export type ProposalSortField =
  | 'clientName'
  | 'branch'
  | 'stage'
  | 'boardType'
  | 'premiumValueInCents'
  | 'createdAt'

export type SortOrder = 'asc' | 'desc'

export interface ProposalFilters {
  organizationId: string
  stage?: Stage
  stageIn?: readonly Stage[]
  branchIn?: readonly Branch[]
  salespersonIdIn?: readonly string[]
  contactId?: string
  clientId?: string
  salespersonId?: string
  boardType?: BoardType
  insurerId?: string
  sourcePolicyId?: string
  createdFrom?: Date
  createdTo?: Date
  updatedAtFrom?: Date
  updatedAtTo?: Date
  search?: string
}

export interface ProposalCursorPage {
  cursor?: string
  limit: number
  sortBy?: ProposalSortField
  sortOrder?: SortOrder
}

export interface ProposalRepository {
  save(proposal: Proposal): Promise<void>
  findById(id: string, organizationId: string): Promise<Proposal | null>
  listForView(
    filters: ProposalFilters,
    page: ProposalCursorPage
  ): Promise<ProposalListPage>
}
