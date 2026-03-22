export type CommissionStatus =
  | 'PENDING_COMMERCIAL'
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'PAID'
  | 'REJECTED'
  | 'REVERSED'

export interface CommissionData {
  readonly id: string
  readonly organizationId: string
  readonly policyId: string
  readonly salespersonId: string
  readonly status: CommissionStatus
  readonly commissionValueInCents: number
  readonly premiumValueInCents: number
  readonly percentageInBasisPoints: number
  readonly splitPercentage: number | null
  readonly approvedBy: string | null
  readonly approvedAt: string | null
  readonly paidAt: string | null
  readonly rejectedBy: string | null
  readonly rejectedAt: string | null
  readonly rejectionReason: string | null
  readonly isReversal: boolean
  readonly originalCommissionId: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly salespersonName?: string
  readonly policyNumber?: string
  readonly clientName?: string
}

export interface CommissionFilters {
  readonly status?: CommissionStatus
  readonly salespersonId?: string
  readonly policyId?: string
  readonly search?: string
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly cursor?: string
  readonly limit?: number
}

export interface CommissionListMeta {
  readonly total: number
  readonly nextCursor: string | null
}
