import type { Proposal, Stage, BoardType } from './proposal.js'

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
  clientId?: string
  salespersonId?: string
  boardType?: BoardType
  insurerId?: string
  sourcePolicyId?: string
  createdFrom?: Date
  createdTo?: Date
  search?: string
}

export interface ProposalCursorPage {
  cursor?: string
  limit: number
  sortBy?: ProposalSortField
  sortOrder?: SortOrder
}

export interface ProposalPage {
  items: Proposal[]
  total?: number
  nextCursor: string | null
}

export interface ProposalRepository {
  save(proposal: Proposal): Promise<void>
  findById(id: string, organizationId: string): Promise<Proposal | null>
  findMany(
    filters: ProposalFilters,
    page: ProposalCursorPage
  ): Promise<ProposalPage>
}
