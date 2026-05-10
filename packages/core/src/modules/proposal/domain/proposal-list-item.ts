import type { InsuredObjectDetails } from './insured-object-details.js'
import type {
  BoardType,
  Branch,
  SourcePolicySnapshot,
  Stage,
} from './proposal.js'

export interface ProposalListItem {
  id: string
  organizationId: string
  contactId: string
  salespersonId: string
  stage: Stage
  boardType: BoardType
  branch: Branch
  premiumValueInCents: number
  commissionPercentageInCents: number
  details: InsuredObjectDetails | null
  lostReason: string | null
  renewalPolicyId: string | null
  renewalPolicyNumber: string | null
  sourcePolicyId: string | null
  endorsementType: string | null
  endorsementReason: string | null
  sourcePolicySnapshot: SourcePolicySnapshot | null
  insurerId: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  coverageStartDate: Date | null
  coverageEndDate: Date | null
  sentToClientAt: Date | null
  clientResponseAt: Date | null
  quoteValidUntil: Date | null
  clientName?: string
  clientDocument?: string
  clientPersonType?: string
  salespersonName?: string
  insurerName?: string
}

export interface ProposalListPage {
  items: ProposalListItem[]
  nextCursor: string | null
}
