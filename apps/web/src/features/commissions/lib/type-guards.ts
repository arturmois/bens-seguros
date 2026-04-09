import {
  ListCommissionsSortBy as SortByEnum,
  type ListCommissionsSortBy,
} from '@/api/model'

import type { CommissionStatus } from './types'
import { COMMISSION_STATUS_OPTIONS } from './constants'

const VALID_SORT_FIELDS = new Set<string>(Object.values(SortByEnum))
const VALID_STATUSES = new Set<string>(
  COMMISSION_STATUS_OPTIONS.map((o) => o.value)
)

export function isSortBy(id: string): id is ListCommissionsSortBy {
  return VALID_SORT_FIELDS.has(id)
}

export function isCommissionStatus(value: string): value is CommissionStatus {
  return VALID_STATUSES.has(value)
}
