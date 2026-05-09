import { Activity, Wrench } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

import { ASSISTANCE_STATUS_OPTIONS, ASSISTANCE_TYPE_OPTIONS } from './constants'

export const ASSISTANCE_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'statusIn',
    label: 'Status',
    icon: Activity,
    type: 'enum',
    options: ASSISTANCE_STATUS_OPTIONS,
  },
  {
    key: 'typeIn',
    label: 'Tipo',
    icon: Wrench,
    type: 'enum',
    options: ASSISTANCE_TYPE_OPTIONS,
  },
] as const
