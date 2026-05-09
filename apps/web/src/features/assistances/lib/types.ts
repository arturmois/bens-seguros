import type {
  ListAssistances200DataItem,
  ListAssistances200DataItemStatus,
  ListAssistancesStatusGroup,
} from '@/api/model'

export type AssistanceStatus = ListAssistances200DataItemStatus
export type AssistanceData = ListAssistances200DataItem

export type AssistanceType =
  | 'TOW_TRUCK'
  | 'MECHANIC'
  | 'LOCKSMITH'
  | 'GLASS'
  | 'OTHER'

export interface AssistanceFilters {
  readonly status?: AssistanceStatus
  readonly statusIn?: string
  readonly statusGroup?: ListAssistancesStatusGroup
  readonly policyId?: string
  readonly clientId?: string
  readonly type?: string
  readonly typeIn?: string
  readonly search?: string
  readonly cursor?: string
  readonly limit?: number
}
