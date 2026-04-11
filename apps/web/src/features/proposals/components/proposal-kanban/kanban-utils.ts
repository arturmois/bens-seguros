import type { QueryClient } from '@tanstack/react-query'

import type { KanbanFilters } from '../../hooks/use-kanban-proposals'
import type { ProposalData, ProposalStage } from '../../lib/constants'
import { STAGES } from '../../lib/constants'

export function isNextStage(
  from: ProposalStage,
  to: ProposalStage,
  stages: readonly ProposalStage[]
): boolean {
  const fromIndex = stages.indexOf(from)
  const toIndex = stages.indexOf(to)
  return toIndex === fromIndex + 1 && to !== 'LOST'
}

export function isProposalStage(value: string): value is ProposalStage {
  return (STAGES as readonly string[]).includes(value)
}

export function getNextStage(
  current: ProposalStage,
  stages: readonly ProposalStage[]
): ProposalStage | null {
  const index = stages.indexOf(current)
  if (index === -1 || index >= stages.length - 1) return null
  const next = stages[index + 1] ?? null
  if (next === 'LOST') return null
  return next
}

export function findProposalInCache(
  queryClient: QueryClient,
  proposalId: string,
  filters: KanbanFilters,
  stages: readonly ProposalStage[]
): { proposal: ProposalData; stage: ProposalStage } | undefined {
  for (const stage of stages) {
    const queryKey = ['proposals', 'kanban', stage, filters]
    const cached = queryClient.getQueryData<{
      pages: Array<{ data: ProposalData[] }>
    }>(queryKey)
    if (!cached) continue

    const found = cached.pages
      .flatMap((p) => p.data)
      .find((p) => p.id === proposalId)

    if (found) return { proposal: found, stage }
  }
  return undefined
}
