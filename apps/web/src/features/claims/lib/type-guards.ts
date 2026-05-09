import type { ListClaimsSortBy } from '@/api/model'

const VALID_SORT_FIELDS = new Set<string>([
  'claimNumber',
  'status',
  'priority',
  'createdAt',
])

export function isSortBy(value: string): value is ListClaimsSortBy {
  return VALID_SORT_FIELDS.has(value)
}
