import type { CursorPage, Page } from '../../../shared/pagination.js'
import type { JsonObject } from '../../occurrence/domain/occurrence-repository.js'

export interface EndorsementData {
  id: string
  organizationId: string
  policyId: string
  type: string
  description: string
  effectiveDate: Date
  previousVersionSnapshot: JsonObject
  changes: JsonObject
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  policyNumber?: string
}

export interface EndorsementFilters {
  organizationId: string
  policyId?: string
}

export interface CreateEndorsementInput {
  organizationId: string
  policyId: string
  type: string
  description: string
  effectiveDate: Date
  previousVersionSnapshot: JsonObject
  changes: JsonObject
  createdBy?: string
}

export interface EndorsementRepository {
  create(data: CreateEndorsementInput): Promise<EndorsementData>
  findById(id: string, organizationId: string): Promise<EndorsementData | null>
  findMany(
    filters: EndorsementFilters,
    page: CursorPage
  ): Promise<Page<EndorsementData>>
}
