import type { VisibilityState } from '@tanstack/react-table'

import type { PolicyBranch, PolicyStatus } from './types'

interface HideableColumn {
  readonly id: string
  readonly label: string
}

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  createdAt: false,
}

export const HIDEABLE_COLUMNS: readonly HideableColumn[] = [
  { id: 'branch', label: 'Ramo' },
  { id: 'premiumValueInCents', label: 'Valor' },
  { id: 'validity', label: 'Vigência' },
  { id: 'createdAt', label: 'Criado em' },
] as const

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  ACTIVE: 'Ativa',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
} as const

export const POLICY_STATUS_BADGE_VARIANT: Record<
  PolicyStatus,
  'success' | 'destructive' | 'warning'
> = {
  ACTIVE: 'success',
  CANCELLED: 'destructive',
  EXPIRED: 'warning',
} as const

export const POLICY_BRANCH_LABELS: Record<PolicyBranch, string> = {
  AUTO: 'Automóvel',
  RESIDENTIAL: 'Residencial',
  CONDOMINIUM: 'Condomínio',
  BUSINESS: 'Empresarial',
  LIFE: 'Vida',
  OTHER: 'Outros',
} as const
