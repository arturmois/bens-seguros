import type { SortingState, VisibilityState } from '@tanstack/react-table'

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  code: true,
  updatedAt: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'code', label: 'Código' },
  { id: 'updatedAt', label: 'Atualizado em' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]
