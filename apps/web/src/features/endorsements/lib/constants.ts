import type { EndorsementType } from '../types';

interface SelectOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

export const ENDORSEMENT_TYPE_LABELS: Record<EndorsementType, string> = {
  COVERAGE_CHANGE: 'Alteração de Cobertura',
  PREMIUM_ADJUSTMENT: 'Ajuste de Prêmio',
  DATA_CORRECTION: 'Correção de Dados',
  BENEFICIARY_CHANGE: 'Alteração de Beneficiário',
  OTHER: 'Outro',
};

export const ENDORSEMENT_TYPE_OPTIONS: readonly SelectOption<EndorsementType>[] = [
  { value: 'COVERAGE_CHANGE', label: 'Alteração de Cobertura' },
  { value: 'PREMIUM_ADJUSTMENT', label: 'Ajuste de Prêmio' },
  { value: 'DATA_CORRECTION', label: 'Correção de Dados' },
  { value: 'BENEFICIARY_CHANGE', label: 'Alteração de Beneficiário' },
  { value: 'OTHER', label: 'Outro' },
] as const;
