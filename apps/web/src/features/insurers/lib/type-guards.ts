import { ListInsurersSortBy as SortByEnum } from '@/api/model'
import type { ListInsurersSortBy } from '@/api/model'

const VALID_SORT_FIELDS = new Set<string>(Object.values(SortByEnum))

export function isInsurerSortBy(id: string): id is ListInsurersSortBy {
  return VALID_SORT_FIELDS.has(id)
}
