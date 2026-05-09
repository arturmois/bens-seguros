import {
  ListCommissionsSortBy as SortByEnum,
  type ListCommissionsSortBy,
} from '@/api/model'

const VALID_SORT_FIELDS = new Set<string>(Object.values(SortByEnum))

export function isSortBy(id: string): id is ListCommissionsSortBy {
  return VALID_SORT_FIELDS.has(id)
}
