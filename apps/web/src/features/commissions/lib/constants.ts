import type { CommissionStatus } from '../types'

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

export const COMMISSION_STATUS_COLORS: Record<CommissionStatus, string> = {
  PENDING_COMMERCIAL:
    'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PENDING_ADMIN:
    'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  REVERSED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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
