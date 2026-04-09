import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type { ClientType, MaritalStatus } from './types'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const TYPE_OPTIONS: readonly SelectOption<ClientType>[] = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'FORMER_CLIENT', label: 'Ex-Cliente' },
] as const

export const MARITAL_OPTIONS: readonly SelectOption<MaritalStatus>[] = [
  { value: 'SINGLE', label: 'Solteiro(a)' },
  { value: 'MARRIED', label: 'Casado(a)' },
  { value: 'DIVORCED', label: 'Divorciado(a)' },
  { value: 'WIDOWED', label: 'Viúvo(a)' },
  { value: 'OTHER', label: 'Outro' },
] as const

export const TYPE_LABELS: Record<ClientType, string> = {
  LEAD: 'Lead',
  CLIENT: 'Cliente',
  FORMER_CLIENT: 'Ex-Cliente',
}

export const TYPE_BADGE_VARIANT: Record<
  ClientType,
  'default' | 'warning' | 'destructive'
> = {
  LEAD: 'warning',
  CLIENT: 'default',
  FORMER_CLIENT: 'destructive',
}

export const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...TYPE_OPTIONS,
] as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  document: true,
  type: true,
  createdAt: true,
  phone: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'document', label: 'Documento' },
  { id: 'type', label: 'Tipo' },
  { id: 'createdAt', label: 'Criado em' },
  { id: 'phone', label: 'Telefone' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

export const EMPTY_FORM_VALUES = {
  name: '',
  document: '',
  personType: 'INDIVIDUAL' as const,
  type: 'LEAD' as const,
  email: '',
  phone: '',
  birthDate: '',
  profession: '',
  socialMedia: undefined,
}
