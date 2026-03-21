import type { EndorsementType } from '../types';

interface SelectOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

export const ENDORSEMENT_TYPE_LABELS: Record<EndorsementType, string> = {
  COVERAGE_CHANGE: 'Alteracao de Cobertura',
  PREMIUM_ADJUSTMENT: 'Ajuste de Premio',
  DATA_CORRECTION: 'Correcao de Dados',
  BENEFICIARY_CHANGE: 'Alteracao de Beneficiario',
  OTHER: 'Outro',
};

export const ENDORSEMENT_TYPE_OPTIONS: readonly SelectOption<EndorsementType>[] = [
  { value: 'COVERAGE_CHANGE', label: 'Alteracao de Cobertura' },
  { value: 'PREMIUM_ADJUSTMENT', label: 'Ajuste de Premio' },
  { value: 'DATA_CORRECTION', label: 'Correcao de Dados' },
  { value: 'BENEFICIARY_CHANGE', label: 'Alteracao de Beneficiario' },
  { value: 'OTHER', label: 'Outro' },
] as const;
