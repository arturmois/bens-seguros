import { CalendarClock, CalendarPlus, Layers, Tag, User } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'
import { useSalespersonOptions } from '@/features/members/hooks/use-salesperson-options'

import { BRANCH_LABELS, BRANCHES, STAGE_LABELS, STAGES } from './constants'

const STAGE_OPTIONS = STAGES.map((s) => ({
  value: s,
  label: STAGE_LABELS[s],
}))

const BRANCH_OPTIONS = BRANCHES.map((b) => ({
  value: b,
  label: BRANCH_LABELS[b],
}))

export const PROPOSAL_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'stageIn',
    label: 'Estágio',
    icon: Layers,
    type: 'enum',
    options: STAGE_OPTIONS,
  },
  {
    key: 'branchIn',
    label: 'Ramo',
    icon: Tag,
    type: 'enum',
    options: BRANCH_OPTIONS,
  },
  {
    key: 'salespersonIdIn',
    label: 'Vendedor',
    icon: User,
    type: 'enum',
    useOptions: useSalespersonOptions,
  },
  {
    key: 'createdAt',
    label: 'Criada em',
    icon: CalendarPlus,
    type: 'dateRange',
  },
  {
    key: 'updatedAt',
    label: 'Atualizada em',
    icon: CalendarClock,
    type: 'dateRange',
  },
] as const
