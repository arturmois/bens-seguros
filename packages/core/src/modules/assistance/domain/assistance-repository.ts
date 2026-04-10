import type { CursorPage, Page } from '../../client/domain/client-repository.js'

export type AssistanceStatus =
  | 'REQUESTED'
  | 'AWAITING_DOCUMENT'
  | 'PENDING_INSPECTION'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'

export interface AssistanceData {
  id: string
  organizationId: string
  policyId: string
  clientId: string
  claimId: string | null
  type: string
  status: AssistanceStatus
  description: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  providerName: string | null
  providerPhone: string | null
  requestedAt: Date
  scheduledAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  policyNumber?: string
  clientName?: string
}

export interface AssistanceFilters {
  organizationId: string
  status?: AssistanceStatus
  policyId?: string
  clientId?: string
  type?: string
  search?: string
}

export interface CreateAssistanceInput {
  organizationId: string
  policyId: string
  clientId: string
  claimId?: string
  type: string
  description?: string
  address?: string
  latitude?: number
  longitude?: number
  providerName?: string
  providerPhone?: string
  scheduledAt?: Date
}

export interface UpdateAssistanceStatusInput {
  status: AssistanceStatus
  completedAt?: Date
}

export type AssistanceSortField =
  | 'type'
  | 'status'
  | 'requestedAt'
  | 'createdAt'

export interface AssistanceRepository {
  create(data: CreateAssistanceInput): Promise<AssistanceData>
  findById(id: string, organizationId: string): Promise<AssistanceData | null>
  findMany(
    filters: AssistanceFilters,
    page: CursorPage<AssistanceSortField>
  ): Promise<Page<AssistanceData>>
  updateStatus(
    id: string,
    organizationId: string,
    data: UpdateAssistanceStatusInput
  ): Promise<AssistanceData>
}
