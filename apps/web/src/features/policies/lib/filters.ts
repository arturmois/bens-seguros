import { CalendarRange, FileSignature, Layers, Shield } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Ativa' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'EXPIRED', label: 'Expirada' },
] as const

const BRANCH_OPTIONS = [
  { value: 'AUTO', label: 'Automóvel' },
  { value: 'RESIDENTIAL', label: 'Residencial' },
  { value: 'CONDOMINIUM', label: 'Condomínio' },
  { value: 'BUSINESS', label: 'Empresarial' },
  { value: 'LIFE', label: 'Vida' },
  { value: 'OTHER', label: 'Outros' },
] as const

const BOARD_TYPE_OPTIONS = [
  { value: 'NEW_INSURANCE', label: 'Novo seguro' },
  { value: 'RENEWAL', label: 'Renovação' },
  { value: 'ENDORSEMENT', label: 'Endosso' },
] as const

export const POLICY_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'statusIn',
    label: 'Status',
    icon: Shield,
    type: 'enum',
    options: STATUS_OPTIONS,
  },
  {
    key: 'branchIn',
    label: 'Ramo',
    icon: Layers,
    type: 'enum',
    options: BRANCH_OPTIONS,
  },
  {
    key: 'boardTypeIn',
    label: 'Tipo',
    icon: FileSignature,
    type: 'enum',
    options: BOARD_TYPE_OPTIONS,
  },
  {
    key: 'endDateRange',
    label: 'Vigência fim',
    icon: CalendarRange,
    type: 'dateRange',
    hiddenInPopover: true,
  },
  {
    key: 'createdRange',
    label: 'Criado em',
    icon: CalendarRange,
    type: 'dateRange',
    hiddenInPopover: true,
  },
] as const
