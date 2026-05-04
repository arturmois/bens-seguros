import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type { CreateClientBodyMaritalStatus } from '@/api/model'

import type { ClientPersonType } from './types'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const PERSON_TYPE_OPTIONS: readonly SelectOption<ClientPersonType>[] = [
  { value: 'INDIVIDUAL', label: 'Pessoa Física' },
  { value: 'COMPANY', label: 'Pessoa Jurídica' },
] as const

export const PERSON_TYPE_LABELS: Record<ClientPersonType, string> = {
  INDIVIDUAL: 'PF',
  COMPANY: 'PJ',
}

export const PERSON_TYPE_BADGE_VARIANT: Record<
  ClientPersonType,
  'default' | 'secondary'
> = {
  INDIVIDUAL: 'default',
  COMPANY: 'secondary',
}

export const MARITAL_STATUS_OPTIONS: readonly SelectOption<
  NonNullable<CreateClientBodyMaritalStatus>
>[] = [
  { value: 'SINGLE', label: 'Solteiro(a)' },
  { value: 'MARRIED', label: 'Casado(a)' },
  { value: 'DIVORCED', label: 'Divorciado(a)' },
  { value: 'WIDOWED', label: 'Viúvo(a)' },
  { value: 'OTHER', label: 'Outro' },
] as const

export const ACTIVE_POLICY_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Com apólice ativa' },
  { value: 'false', label: 'Sem apólice ativa' },
] as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  document: true,
  personType: true,
  activePolicyCount: true,
  contactCount: true,
  createdAt: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'document', label: 'Documento' },
  { id: 'personType', label: 'Tipo' },
  { id: 'activePolicyCount', label: 'Apólices ativas' },
  { id: 'contactCount', label: 'Contatos' },
  { id: 'createdAt', label: 'Criado em' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
