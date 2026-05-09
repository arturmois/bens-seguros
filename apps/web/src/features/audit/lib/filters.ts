import { Activity, Box, CalendarRange } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

const ACTION_OPTIONS = [
  { value: 'CREATE', label: 'Criação' },
  { value: 'UPDATE', label: 'Atualização' },
  { value: 'DELETE', label: 'Exclusão' },
  { value: 'APPROVE', label: 'Aprovação' },
  { value: 'REJECT', label: 'Rejeição' },
] as const

const ENTITY_TYPE_OPTIONS = [
  { value: 'Client', label: 'Cliente' },
  { value: 'Proposal', label: 'Proposta' },
  { value: 'Policy', label: 'Apólice' },
  { value: 'Claim', label: 'Sinistro' },
  { value: 'Commission', label: 'Comissão' },
] as const

export const AUDIT_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'actionIn',
    label: 'Ação',
    icon: Activity,
    type: 'enum',
    options: ACTION_OPTIONS,
  },
  {
    key: 'entityTypeIn',
    label: 'Entidade',
    icon: Box,
    type: 'enum',
    options: ENTITY_TYPE_OPTIONS,
  },
  {
    key: 'createdAt',
    label: 'Período',
    icon: CalendarRange,
    type: 'dateRange',
  },
] as const
