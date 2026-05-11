import { Check } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Ativo' },
  { value: 'false', label: 'Inativo' },
] as const

export const INSURER_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'active',
    label: 'Status',
    icon: Check,
    type: 'enum',
    options: STATUS_OPTIONS,
  },
] as const
