import type { AiAgentData } from '../types'
import type { AiAgentStatusFilter } from './types'

export function isAiAgentStatusFilter(
  value: string
): value is AiAgentStatusFilter {
  return value === 'ALL' || value === 'ACTIVE' || value === 'INACTIVE'
}

export function matchesStatus(
  agent: AiAgentData,
  filter: AiAgentStatusFilter
): boolean {
  if (filter === 'ALL') return true
  return filter === 'ACTIVE' ? agent.isActive : !agent.isActive
}

export function matchesSearch(agent: AiAgentData, search: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  return (
    agent.name.toLowerCase().includes(needle) ||
    (agent.description ?? '').toLowerCase().includes(needle)
  )
}
