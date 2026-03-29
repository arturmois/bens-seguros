import type { CursorPage, Page } from '../../client/domain/client-repository.js'

export type ClaimStatus =
  | 'REGISTERED'
  | 'IN_ANALYSIS'
  | 'AWAITING_DOCUMENT'
  | 'PENDING_INSPECTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'COMPLETED'

export type ClaimPriority = 'NORMAL' | 'HIGH' | 'URGENT'

export interface ClaimData {
  id: string
  organizationId: string
  claimNumber: number
  policyId: string
  clientId: string
  insurerId: string | null
  assignedToId: string | null
  status: ClaimStatus
  priority: ClaimPriority
  description: string
  estimatedValueInCents: number | null
  incidentDate: Date | null
  incidentLocation: string | null
  reportedAt: Date
  resolvedAt: Date | null
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
  policyNumber?: string
  clientName?: string
  insurerName?: string
  assignedToName?: string
}

export interface ClaimFilters {
  organizationId: string
  status?: ClaimStatus
  priority?: ClaimPriority
  policyId?: string
  clientId?: string
  search?: string
}

export interface CreateClaimInput {
  organizationId: string
  policyId: string
  clientId: string
  insurerId?: string
  assignedToId?: string
  priority?: ClaimPriority
  description: string
  estimatedValueInCents?: number
  incidentDate?: Date
  incidentLocation?: string
}

export interface UpdateClaimStatusInput {
  status: ClaimStatus
  resolvedAt?: Date
  closedAt?: Date
}

export interface ClaimRepository {
  create(data: CreateClaimInput): Promise<ClaimData>
  findById(id: string, organizationId: string): Promise<ClaimData | null>
  findMany(filters: ClaimFilters, page: CursorPage): Promise<Page<ClaimData>>
  updateStatus(
    id: string,
    organizationId: string,
    data: UpdateClaimStatusInput
  ): Promise<ClaimData>
  softDelete(id: string, organizationId: string): Promise<void>
}
