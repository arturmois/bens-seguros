import {
  ListAssistancesSortBy as SortByEnum,
  type ListAssistancesSortBy,
} from '@/api/model'

const VALID_SORT_FIELDS = new Set<string>(Object.values(SortByEnum))

export function isSortBy(id: string): id is ListAssistancesSortBy {
  return VALID_SORT_FIELDS.has(id)
}
