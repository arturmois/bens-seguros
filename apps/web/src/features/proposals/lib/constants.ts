import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type {
  ListProposals200DataItemStage,
  ListProposals200DataItemBranch,
  ListProposals200DataItemBoardType,
  ListProposals200DataItem,
  GetProposal200Data,
  GetProposalChecklist200DataItemsItem,
  GetProposalChecklist200DataSummary,
} from '@/api/model'

// ---------------------------------------------------------------------------
// Type aliases — keep existing names used across the codebase so that
// component files do not need mass-renaming.
// ---------------------------------------------------------------------------

export type ProposalStage = ListProposals200DataItemStage
export type InsuranceBranch = ListProposals200DataItemBranch
export type BoardType = ListProposals200DataItemBoardType
export type ProposalData = ListProposals200DataItem
export type ProposalDetail = GetProposal200Data
export type ChecklistItem = GetProposalChecklist200DataItemsItem
export type ChecklistSummary = GetProposalChecklist200DataSummary

/**
 * Insured-object detail shapes used by branch-specific form fields.
 * Orval collapses the discriminated union into a single opaque type, so we
 * re-export the per-branch interfaces here for components that need them.
 */
export interface AutoDetails {
  branch: 'AUTO'
  brand: string
  model: string
  manufacturingYear: number
  modelYear: number
  licensePlate?: string
  vin?: string
  color?: string
  fuelType?: string
  vehicleUsage?: string
}

export interface ResidentialDetails {
  branch: 'RESIDENTIAL'
  propertyType: string
  propertyUsage: string
  cep: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  construction?: string
  areaM2?: number
}

export interface CondominiumDetails {
  branch: 'CONDOMINIUM'
  condominiumName: string
  unitCount: number
  cep: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  constructionYear?: number
  floorCount?: number
  blockCount?: number
  elevatorCount?: number
  employeeCount?: number
  hasSecurityEquipment?: boolean
  securityEquipmentDetails?: string
  hasFireEquipment?: boolean
  fireEquipmentDetails?: string
}

export interface BusinessDetails {
  branch: 'BUSINESS'
  legalName: string
  cnpj: string
  businessActivity: string
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  areaM2?: number
}

export interface LifeDetails {
  branch: 'LIFE'
  occupation: string
  monthlyIncomeCents?: number
  isSmoker?: boolean
  extremeSports?: boolean
  heightInCentimeters?: number
  weightInGrams?: number
  beneficiaries?: string
}

export interface OtherDetails {
  branch: 'OTHER'
  description: string
}

export type InsuredObjectDetails =
  | AutoDetails
  | ResidentialDetails
  | CondominiumDetails
  | BusinessDetails
  | LifeDetails
  | OtherDetails

// ---------------------------------------------------------------------------
// UI constants — labels, badge variants, ordered arrays
// ---------------------------------------------------------------------------

export const STAGE_LABELS: Record<ProposalStage, string> = {
  CAPTURE: 'Captação',
  QUOTE: 'Cotação',
  PROTOCOL: 'Protocolo',
  INSPECTION: 'Vistoria',
  PAYMENT: 'Pagamento',
  POLICY_ISSUED: 'Apólice Emitida',
  LOST: 'Perda',
}

export const BRANCH_LABELS: Record<InsuranceBranch, string> = {
  AUTO: 'Auto',
  RESIDENTIAL: 'Residencial',
  CONDOMINIUM: 'Condomínio',
  BUSINESS: 'Empresarial',
  LIFE: 'Vida',
  OTHER: 'Outros',
}

export const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  NEW_INSURANCE: 'Novo Seguro',
  RENEWAL: 'Renovação',
  ENDORSEMENT: 'Endosso',
}

export const STAGE_BADGE_VARIANT: Record<
  ProposalStage,
  'info' | 'warning' | 'default' | 'secondary' | 'success' | 'destructive'
> = {
  CAPTURE: 'info',
  QUOTE: 'warning',
  PROTOCOL: 'default',
  INSPECTION: 'secondary',
  PAYMENT: 'success',
  POLICY_ISSUED: 'success',
  LOST: 'destructive',
}

export const STAGES: readonly ProposalStage[] = [
  'CAPTURE',
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
  'POLICY_ISSUED',
  'LOST',
] as const

export const KANBAN_STAGES: readonly ProposalStage[] = [
  'CAPTURE',
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
] as const

export const BRANCHES: readonly InsuranceBranch[] = [
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
] as const

export const BOARD_TYPES: readonly BoardType[] = [
  'NEW_INSURANCE',
  'RENEWAL',
  'ENDORSEMENT',
] as const

export const ENDORSEMENT_STAGES: readonly ProposalStage[] = [
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
  'POLICY_ISSUED',
  'LOST',
] as const

// ---------------------------------------------------------------------------
// Shared table primitives — column visibility + default sort
// ---------------------------------------------------------------------------

export const ALL_FILTER_VALUE = '__all__'

export const BOARD_TYPE_FILTER_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: 'Todos' },
  { value: 'NEW_INSURANCE', label: 'Novo Seguro' },
  { value: 'RENEWAL', label: 'Renovação' },
  { value: 'ENDORSEMENT', label: 'Endosso' },
] as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  branch: true,
  boardType: true,
  premiumValueInCents: true,
  createdAt: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'branch', label: 'Ramo' },
  { id: 'boardType', label: 'Tipo' },
  { id: 'premiumValueInCents', label: 'Valor' },
  { id: 'createdAt', label: 'Criado em' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]
