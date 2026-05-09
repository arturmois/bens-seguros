import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type { AssistanceStatus, AssistanceType } from './types'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const ASSISTANCE_STATUS_LABELS: Record<AssistanceStatus, string> = {
  REQUESTED: 'Solicitada',
  AWAITING_DOCUMENT: 'Aguardando Documento',
  PENDING_INSPECTION: 'Pendente Vistoria',
  DISPATCHED: 'Despachada',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
}

export const ASSISTANCE_STATUS_COLORS: Record<AssistanceStatus, string> = {
  REQUESTED:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  AWAITING_DOCUMENT:
    'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PENDING_INSPECTION:
    'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  DISPATCHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  IN_PROGRESS:
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  COMPLETED:
    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

export const ASSISTANCE_STATUS_BUTTON_STYLES: Record<
  AssistanceStatus,
  { variant: 'outline' | 'destructive' | 'default'; className: string }
> = {
  REQUESTED: { variant: 'outline', className: '' },
  AWAITING_DOCUMENT: { variant: 'outline', className: '' },
  PENDING_INSPECTION: { variant: 'outline', className: '' },
  DISPATCHED: { variant: 'outline', className: '' },
  IN_PROGRESS: { variant: 'outline', className: '' },
  COMPLETED: {
    variant: 'default',
    className:
      'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600',
  },
}

export const ASSISTANCE_TYPE_LABELS: Record<AssistanceType, string> = {
  TOW_TRUCK: 'Guincho',
  MECHANIC: 'Mecânico',
  LOCKSMITH: 'Chaveiro',
  GLASS: 'Vidros',
  OTHER: 'Outro',
}

/** Safe lookup — Orval types `type` as plain string */
export function getAssistanceTypeLabel(type: string): string {
  return (ASSISTANCE_TYPE_LABELS as Record<string, string>)[type] ?? type
}

export const ASSISTANCE_STATUS_OPTIONS: readonly SelectOption<AssistanceStatus>[] =
  [
    { value: 'REQUESTED', label: 'Solicitada' },
    { value: 'AWAITING_DOCUMENT', label: 'Aguardando Documento' },
    { value: 'PENDING_INSPECTION', label: 'Pendente Vistoria' },
    { value: 'DISPATCHED', label: 'Despachada' },
    { value: 'IN_PROGRESS', label: 'Em Andamento' },
    { value: 'COMPLETED', label: 'Concluída' },
  ] as const

export const ASSISTANCE_TYPE_OPTIONS: readonly SelectOption<AssistanceType>[] =
  [
    { value: 'TOW_TRUCK', label: 'Guincho' },
    { value: 'MECHANIC', label: 'Mecânico' },
    { value: 'LOCKSMITH', label: 'Chaveiro' },
    { value: 'GLASS', label: 'Vidros' },
    { value: 'OTHER', label: 'Outro' },
  ] as const

export const VALID_ASSISTANCE_TRANSITIONS: Record<
  AssistanceStatus,
  readonly AssistanceStatus[]
> = {
  REQUESTED: ['AWAITING_DOCUMENT', 'DISPATCHED'],
  AWAITING_DOCUMENT: ['PENDING_INSPECTION'],
  PENDING_INSPECTION: ['DISPATCHED'],
  DISPATCHED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
} as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  policyNumber: true,
  clientName: true,
  address: true,
  requestedAt: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'policyNumber', label: 'Apólice' },
  { id: 'clientName', label: 'Cliente' },
  { id: 'address', label: 'Endereço' },
  { id: 'requestedAt', label: 'Data Solicitação' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]
