import type { SortingState, VisibilityState } from '@tanstack/react-table'

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  email: true,
  createdAt: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'email', label: 'E-mail' },
  { id: 'createdAt', label: 'Desde' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]
