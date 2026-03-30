import type {
  ListPolicies200DataItemStatus,
  ListPolicies200DataItemBranch,
  ListPolicies200DataItem,
  GetPolicy200Data,
} from '@/api/model'

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type PolicyStatus = ListPolicies200DataItemStatus
export type PolicyBranch = ListPolicies200DataItemBranch
export type PolicyData = ListPolicies200DataItem
export type PolicyDetail = GetPolicy200Data

// ---------------------------------------------------------------------------
// UI constants
// ---------------------------------------------------------------------------

export const POLICY_STATUSES: readonly PolicyStatus[] = [
  'ACTIVE',
  'CANCELLED',
  'EXPIRED',
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
