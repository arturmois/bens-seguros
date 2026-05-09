import type {
  ListClaims200DataItem,
  ListClaims200DataItemPriority,
  ListClaims200DataItemStatus,
  ListClaims200Meta,
  ListClaimsStatusGroup,
  ListClaimsSortBy,
  ListClaimsSortOrder,
} from '@/api/model'

export type ClaimData = ListClaims200DataItem
export type ClaimStatus = ListClaims200DataItemStatus
export type ClaimPriority = ListClaims200DataItemPriority

export interface ClaimFilters {
  readonly status?: ClaimStatus
  readonly statusIn?: string
  readonly statusGroup?: ListClaimsStatusGroup
  readonly priority?: ClaimPriority
  readonly priorityIn?: string
  readonly policyId?: string
  readonly clientId?: string
  readonly search?: string
  readonly cursor?: string
  readonly limit?: number
  readonly sortBy?: ListClaimsSortBy
  readonly sortOrder?: ListClaimsSortOrder
}

export interface ClaimsQueryData {
  readonly data: ListClaims200DataItem[]
  readonly meta: ListClaims200Meta
}
