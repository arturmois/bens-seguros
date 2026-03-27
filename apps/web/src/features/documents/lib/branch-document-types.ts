import type { InsuranceBranch } from '@/features/proposals/types'

import type { DocumentType } from '../types'

interface DocumentTypeOption {
  readonly value: DocumentType
  readonly label: string
}

const AUTO_TYPES: readonly DocumentTypeOption[] = [
  { value: 'DRIVER_LICENSE', label: 'CNH — Carteira de Habilitacao' },
  { value: 'VEHICLE_REGISTRATION', label: 'CRLV — Registro do Veiculo' },
  { value: 'OTHER', label: 'Outro' },
] as const

const LIFE_TYPES: readonly DocumentTypeOption[] = [
  { value: 'HEALTH_DECLARATION', label: 'Declaracao de Saude' },
  { value: 'OTHER', label: 'Outro' },
] as const

const RESIDENTIAL_TYPES: readonly DocumentTypeOption[] = [
  { value: 'PROOF_OF_ADDRESS', label: 'Comprovante de Endereco' },
  { value: 'OTHER', label: 'Outro' },
] as const

const BUSINESS_TYPES: readonly DocumentTypeOption[] = [
  { value: 'SOCIAL_CONTRACT', label: 'Contrato Social' },
  { value: 'CNPJ_CARD', label: 'Cartao CNPJ' },
  { value: 'OTHER', label: 'Outro' },
] as const

const DEFAULT_TYPES: readonly DocumentTypeOption[] = [
  { value: 'OTHER', label: 'Outro' },
] as const

const BRANCH_DOCUMENT_TYPES: Record<
  InsuranceBranch,
  readonly DocumentTypeOption[]
> = {
  AUTO: AUTO_TYPES,
  LIFE: LIFE_TYPES,
  RESIDENTIAL: RESIDENTIAL_TYPES,
  CONDOMINIUM: RESIDENTIAL_TYPES,
  BUSINESS: BUSINESS_TYPES,
  OTHER: DEFAULT_TYPES,
}

export type { DocumentTypeOption }

export function getDocumentTypesForBranch(
  branch: InsuranceBranch
): readonly DocumentTypeOption[] {
  return BRANCH_DOCUMENT_TYPES[branch]
}
