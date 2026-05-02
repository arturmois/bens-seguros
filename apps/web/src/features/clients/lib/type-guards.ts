import {
  ListClientsSortBy as SortByEnum,
  type ListClientsSortBy,
} from '@/api/model'

const VALID_SORT_FIELDS = new Set<string>(Object.values(SortByEnum))

export function isSortBy(id: string): id is ListClientsSortBy {
  return VALID_SORT_FIELDS.has(id)
}
