import { Check } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

import type { AiAgentData } from '../types'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Ativo' },
  { value: 'false', label: 'Inativo' },
] as const

export const AI_AGENT_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'active',
    label: 'Status',
    icon: Check,
    type: 'enum',
    options: STATUS_OPTIONS,
  },
] as const

export function matchesStatus(
  agent: AiAgentData,
  active: boolean | undefined
): boolean {
  if (active === undefined) return true
  return agent.isActive === active
}

export function matchesSearch(agent: AiAgentData, search: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  return (
    agent.name.toLowerCase().includes(needle) ||
    (agent.description ?? '').toLowerCase().includes(needle)
  )
}
