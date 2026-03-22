export type AssistanceStatus =
  | 'REQUESTED'
  | 'AWAITING_DOCUMENT'
  | 'PENDING_INSPECTION'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'

export type AssistanceType =
  | 'TOW_TRUCK'
  | 'MECHANIC'
  | 'LOCKSMITH'
  | 'GLASS'
  | 'OTHER'

export interface AssistanceData {
  readonly id: string
  readonly organizationId: string
  readonly policyId: string
  readonly clientId: string
  readonly claimId: string | null
  readonly type: AssistanceType
  readonly status: AssistanceStatus
  readonly description: string | null
  readonly address: string | null
  readonly latitude: number | null
  readonly longitude: number | null
  readonly providerName: string | null
  readonly providerPhone: string | null
  readonly requestedAt: string
  readonly scheduledAt: string | null
  readonly completedAt: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly policyNumber?: string
  readonly clientName?: string
}

export interface AssistanceFilters {
  readonly status?: AssistanceStatus
  readonly policyId?: string
  readonly clientId?: string
  readonly type?: string
  readonly cursor?: string
  readonly limit?: number
}

export interface AssistanceListMeta {
  readonly total: number
  readonly nextCursor: string | null
}
