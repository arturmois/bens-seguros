import {
  ListClientsSortBy as SortByEnum,
  type ListClientsSortBy,
} from '@/api/model'
import type { ClientType } from './types'
import { TYPE_OPTIONS } from './constants'

const VALID_SORT_FIELDS = new Set<string>(Object.values(SortByEnum))
const VALID_CLIENT_TYPES = new Set<string>(TYPE_OPTIONS.map((o) => o.value))

export function isSortBy(id: string): id is ListClientsSortBy {
  return VALID_SORT_FIELDS.has(id)
}

export function isClientType(value: string): value is ClientType {
  return VALID_CLIENT_TYPES.has(value)
}
