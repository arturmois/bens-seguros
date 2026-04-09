import type {
  ListCommissions200DataItem,
  ListCommissions200DataItemStatus,
} from '@/api/model'

export type CommissionStatus = ListCommissions200DataItemStatus
export type CommissionData = ListCommissions200DataItem

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
