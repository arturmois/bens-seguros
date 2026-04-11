import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type { InsurerStatusFilter } from './types'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const STATUS_FILTER_OPTIONS: readonly SelectOption<InsurerStatusFilter>[] =
  [
    { value: 'ALL', label: 'Todas' },
    { value: 'ACTIVE', label: 'Ativas' },
    { value: 'INACTIVE', label: 'Inativas' },
  ] as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  code: true,
  updatedAt: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'code', label: 'Código' },
  { id: 'updatedAt', label: 'Atualizado em' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]
