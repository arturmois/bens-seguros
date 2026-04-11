import type {
  ListClaims200DataItemPriority,
  ListClaims200DataItemStatus,
  ListClaimsSortBy,
} from '@/api/model'

const VALID_SORT_FIELDS = new Set<string>([
  'claimNumber',
  'status',
  'priority',
  'createdAt',
])

const VALID_STATUSES = new Set<string>([
  'REGISTERED',
  'IN_ANALYSIS',
  'AWAITING_DOCUMENT',
  'PENDING_INSPECTION',
  'APPROVED',
  'REJECTED',
  'PAID',
  'COMPLETED',
])

const VALID_PRIORITIES = new Set<string>(['NORMAL', 'HIGH', 'URGENT'])

export function isSortBy(value: string): value is ListClaimsSortBy {
  return VALID_SORT_FIELDS.has(value)
}

export function isClaimStatus(
  value: string
): value is ListClaims200DataItemStatus {
  return VALID_STATUSES.has(value)
}

export function isClaimPriority(
  value: string
): value is ListClaims200DataItemPriority {
  return VALID_PRIORITIES.has(value)
}
