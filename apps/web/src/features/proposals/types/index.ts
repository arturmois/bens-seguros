export type ProposalStage =
  | 'CAPTURE'
  | 'QUOTE'
  | 'PROTOCOL'
  | 'INSPECTION'
  | 'PAYMENT'
  | 'POLICY_ISSUED'
  | 'LOST'

export type InsuranceBranch =
  | 'AUTO'
  | 'RESIDENTIAL'
  | 'CONDOMINIUM'
  | 'BUSINESS'
  | 'LIFE'
  | 'OTHER'

export type BoardType = 'NEW_INSURANCE' | 'RENEWAL'

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
  address?: string
  construction?: string
  areaM2?: number
}

export interface CondominiumDetails {
  branch: 'CONDOMINIUM'
  condominiumName: string
  unitCount: number
  cep: string
  address?: string
  constructionYear?: number
  floorCount?: number
}

export interface BusinessDetails {
  branch: 'BUSINESS'
  legalName: string
  cnpj: string
  businessActivity: string
  cep?: string
  address?: string
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

export interface ProposalData {
  id: string
  organizationId: string
  clientId: string
  clientName?: string
  salespersonId: string
  salespersonName?: string
  stage: ProposalStage
  boardType: BoardType
  branch: InsuranceBranch
  premiumValueInCents: number
  commissionPercentageInCents: number
  details: InsuredObjectDetails | null
  lostReason: string | null
  renewalPolicyId: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

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
] as const

export interface ChecklistItem {
  readonly id: string
  readonly proposalId: string
  readonly itemKey: string
  readonly label: string
  readonly isRequired: boolean
  readonly isCompleted: boolean
  readonly completedAt: string | null
  readonly completedBy: string | null
  readonly createdAt: string
}

export interface ChecklistSummary {
  readonly total: number
  readonly completed: number
  readonly required: number
  readonly requiredCompleted: number
  readonly canAdvance: boolean
}
