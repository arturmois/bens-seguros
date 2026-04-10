import {
  ListAssistancesSortBy as SortByEnum,
  type ListAssistancesSortBy,
} from '@/api/model'

import type { AssistanceStatus } from './types'
import { ASSISTANCE_STATUS_OPTIONS } from './constants'

const VALID_SORT_FIELDS = new Set<string>(Object.values(SortByEnum))
const VALID_STATUSES = new Set<string>(
  ASSISTANCE_STATUS_OPTIONS.map((o) => o.value)
)

export function isSortBy(id: string): id is ListAssistancesSortBy {
  return VALID_SORT_FIELDS.has(id)
}

export function isAssistanceStatus(value: string): value is AssistanceStatus {
  return VALID_STATUSES.has(value)
}
