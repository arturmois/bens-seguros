import { Activity, CalendarRange } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

import { COMMISSION_STATUS_OPTIONS } from './constants'

export const COMMISSION_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'statusIn',
    label: 'Status',
    icon: Activity,
    type: 'enum',
    options: COMMISSION_STATUS_OPTIONS,
  },
  {
    key: 'createdAt',
    label: 'Criado em',
    icon: CalendarRange,
    type: 'dateRange',
  },
] as const
