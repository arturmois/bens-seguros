import { Activity, AlertTriangle } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

import { CLAIM_PRIORITY_OPTIONS, CLAIM_STATUS_OPTIONS } from './constants'

export const CLAIM_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'statusIn',
    label: 'Status',
    icon: Activity,
    type: 'enum',
    options: CLAIM_STATUS_OPTIONS,
  },
  {
    key: 'priorityIn',
    label: 'Prioridade',
    icon: AlertTriangle,
    type: 'enum',
    options: CLAIM_PRIORITY_OPTIONS,
  },
] as const
