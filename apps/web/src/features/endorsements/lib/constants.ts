import type { ListEndorsements200DataItem } from '@/api/model'

export type EndorsementType =
  | 'COVERAGE_CHANGE'
  | 'PREMIUM_ADJUSTMENT'
  | 'DATA_CORRECTION'
  | 'BENEFICIARY_CHANGE'
  | 'OTHER'

export type EndorsementData = ListEndorsements200DataItem

export interface EndorsementFilters {
  readonly policyId?: string
  readonly cursor?: string
  readonly limit?: number
}

export interface EndorsementListMeta {
  readonly total: number
  readonly nextCursor: string | null
}

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const ENDORSEMENT_TYPE_LABELS: Record<EndorsementType, string> = {
  COVERAGE_CHANGE: 'Alteração de Cobertura',
  PREMIUM_ADJUSTMENT: 'Ajuste de Prêmio',
  DATA_CORRECTION: 'Correção de Dados',
  BENEFICIARY_CHANGE: 'Alteração de Beneficiário',
  OTHER: 'Outro',
}

/** Safe lookup — Orval types `type` as plain string */
export function getEndorsementTypeLabel(type: string): string {
  return (ENDORSEMENT_TYPE_LABELS as Record<string, string>)[type] ?? type
}

export const ENDORSEMENT_TYPE_OPTIONS: readonly SelectOption<EndorsementType>[] =
  [
    { value: 'COVERAGE_CHANGE', label: 'Alteração de Cobertura' },
    { value: 'PREMIUM_ADJUSTMENT', label: 'Ajuste de Prêmio' },
    { value: 'DATA_CORRECTION', label: 'Correção de Dados' },
    { value: 'BENEFICIARY_CHANGE', label: 'Alteração de Beneficiário' },
    { value: 'OTHER', label: 'Outro' },
  ] as const
