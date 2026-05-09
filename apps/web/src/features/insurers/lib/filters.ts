import { Check } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

export const INSURER_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'active',
    label: 'Status',
    icon: Check,
    type: 'boolean',
  },
] as const
