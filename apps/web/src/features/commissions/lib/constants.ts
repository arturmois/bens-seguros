import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type { CommissionStatus } from './types'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  PENDING_COMMERCIAL: 'Pendente Comercial',
  PENDING_ADMIN: 'Pendente Admin',
  APPROVED: 'Aprovada',
  PAID: 'Paga',
  REJECTED: 'Rejeitada',
  REVERSED: 'Estornada',
}

export const COMMISSION_STATUS_BADGE_VARIANT: Record<
  CommissionStatus,
  'warning' | 'info' | 'success' | 'error' | 'secondary'
> = {
  PENDING_COMMERCIAL: 'warning',
  PENDING_ADMIN: 'info',
  APPROVED: 'info',
  PAID: 'success',
  REJECTED: 'error',
  REVERSED: 'secondary',
}

export const COMMISSION_STATUS_OPTIONS: readonly SelectOption<CommissionStatus>[] =
  [
    { value: 'PENDING_COMMERCIAL', label: 'Pendente Comercial' },
    { value: 'PENDING_ADMIN', label: 'Pendente Admin' },
    { value: 'APPROVED', label: 'Aprovada' },
    { value: 'PAID', label: 'Paga' },
    { value: 'REJECTED', label: 'Rejeitada' },
    { value: 'REVERSED', label: 'Estornada' },
  ] as const

export const TERMINAL_COMMISSION_STATUSES: readonly CommissionStatus[] = [
  'REJECTED',
  'REVERSED',
] as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  policyNumber: true,
  clientName: true,
  premiumValueInCents: true,
  createdAt: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'policyNumber', label: 'Apólice' },
  { id: 'clientName', label: 'Cliente' },
  { id: 'premiumValueInCents', label: 'Prêmio' },
  { id: 'createdAt', label: 'Criado em' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]
