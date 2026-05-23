import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type { ClaimPriority, ClaimStatus } from './types'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

interface HideableColumn {
  readonly id: string
  readonly label: string
}

export const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  incidentLocation: false,
}

export const HIDEABLE_COLUMNS: readonly HideableColumn[] = [
  { id: 'clientName', label: 'Cliente' },
  { id: 'policyNumber', label: 'Apólice' },
  { id: 'priority', label: 'Prioridade' },
  { id: 'incidentLocation', label: 'Local' },
  { id: 'createdAt', label: 'Criado em' },
] as const

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  REGISTERED: 'Registrado',
  IN_ANALYSIS: 'Em Análise',
  AWAITING_DOCUMENT: 'Aguardando Documento',
  PENDING_INSPECTION: 'Pendente Vistoria',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  PAID: 'Pago',
  COMPLETED: 'Concluído',
}

export const CLAIM_PRIORITY_LABELS: Record<ClaimPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

type ClaimBadgeVariant = 'secondary' | 'info' | 'warning' | 'success' | 'error'

export const CLAIM_STATUS_BADGE_VARIANT: Record<
  ClaimStatus,
  ClaimBadgeVariant
> = {
  REGISTERED: 'secondary',
  IN_ANALYSIS: 'info',
  AWAITING_DOCUMENT: 'warning',
  PENDING_INSPECTION: 'warning',
  APPROVED: 'info',
  REJECTED: 'error',
  PAID: 'success',
  COMPLETED: 'success',
}

export const CLAIM_PRIORITY_BADGE_VARIANT: Record<
  ClaimPriority,
  ClaimBadgeVariant
> = {
  NORMAL: 'secondary',
  HIGH: 'warning',
  URGENT: 'error',
}

export const CLAIM_STATUS_BUTTON_VARIANT: Record<
  ClaimStatus,
  'outline' | 'destructive' | 'default'
> = {
  REGISTERED: 'outline',
  IN_ANALYSIS: 'outline',
  AWAITING_DOCUMENT: 'outline',
  PENDING_INSPECTION: 'outline',
  APPROVED: 'default',
  REJECTED: 'destructive',
  PAID: 'default',
  COMPLETED: 'outline',
}

export const CLAIM_STATUS_OPTIONS: readonly SelectOption<ClaimStatus>[] = [
  { value: 'REGISTERED', label: 'Registrado' },
  { value: 'IN_ANALYSIS', label: 'Em Análise' },
  { value: 'AWAITING_DOCUMENT', label: 'Aguardando Documento' },
  { value: 'PENDING_INSPECTION', label: 'Pendente Vistoria' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'REJECTED', label: 'Rejeitado' },
  { value: 'PAID', label: 'Pago' },
  { value: 'COMPLETED', label: 'Concluído' },
] as const

export const CLAIM_PRIORITY_OPTIONS: readonly SelectOption<ClaimPriority>[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
] as const

export const VALID_CLAIM_TRANSITIONS: Record<
  ClaimStatus,
  readonly ClaimStatus[]
> = {
  REGISTERED: ['IN_ANALYSIS'],
  IN_ANALYSIS: [
    'AWAITING_DOCUMENT',
    'PENDING_INSPECTION',
    'APPROVED',
    'REJECTED',
  ],
  AWAITING_DOCUMENT: ['IN_ANALYSIS'],
  PENDING_INSPECTION: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID'],
  REJECTED: [],
  PAID: ['COMPLETED'],
  COMPLETED: [],
} as const

export function formatClaimNumber(
  claimNumber: number,
  createdAt: string | Date
): string {
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const year = date.getFullYear()
  const padded = String(claimNumber).padStart(4, '0')
  return `SIN-${year}-${padded}`
}
