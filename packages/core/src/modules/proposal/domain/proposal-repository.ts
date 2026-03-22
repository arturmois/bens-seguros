import type { Proposal, Stage, BoardType } from './proposal.js'

export interface ProposalFilters {
  organizationId: string
  stage?: Stage
  clientId?: string
  salespersonId?: string
  boardType?: BoardType
  search?: string
}

export interface ProposalCursorPage {
  cursor?: string
  limit: number
}

export interface ProposalPage {
  items: Proposal[]
  total: number
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
