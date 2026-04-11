import { ListProposalsSortBy as SortByEnum } from '@/api/model'
import type { ListProposalsSortBy } from '@/api/model'

const VALID_SORT_FIELDS = new Set<string>(Object.values(SortByEnum))

export function isProposalSortBy(id: string): id is ListProposalsSortBy {
  return VALID_SORT_FIELDS.has(id)
}
