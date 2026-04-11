import type { SortingState, VisibilityState } from '@tanstack/react-table'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const ROLE_FILTER_OPTIONS: readonly SelectOption<string>[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'OWNER', label: 'Proprietários' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'MANAGER', label: 'Gerentes' },
  { value: 'COMMERCIAL', label: 'Comercial' },
  { value: 'VIEWER', label: 'Visualizadores' },
] as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  email: true,
  createdAt: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'email', label: 'E-mail' },
  { id: 'createdAt', label: 'Desde' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]
