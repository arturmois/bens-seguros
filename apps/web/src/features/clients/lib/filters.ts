import { Check, User } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

import { PERSON_TYPE_OPTIONS } from './constants'

export const CLIENT_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'personTypeIn',
    label: 'Tipo',
    icon: User,
    type: 'enum',
    options: PERSON_TYPE_OPTIONS,
  },
  {
    key: 'hasActivePolicy',
    label: 'Apólice ativa',
    icon: Check,
    type: 'boolean',
  },
] as const
