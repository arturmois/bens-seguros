import type { SortingState, VisibilityState } from '@tanstack/react-table'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const ACTIVE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
] as const

export type ActiveFilter = (typeof ACTIVE_FILTER_OPTIONS)[number]['value']

export function isActiveFilter(value: string): value is ActiveFilter {
  return value === 'ALL' || value === 'ACTIVE' || value === 'INACTIVE'
}

export const ROLE_SELECT_OPTIONS: readonly SelectOption<string>[] = [
  { value: 'ALL', label: 'Todos cargos' },
  { value: 'OWNER', label: 'Proprietário' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'COMMERCIAL', label: 'Comercial' },
  { value: 'VIEWER', label: 'Visualizador' },
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
