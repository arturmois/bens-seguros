'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'

import type { BoardType, ProposalData, ProposalStage } from '../types'
import { STAGES } from '../types'

const KANBAN_LIMIT = 500

interface KanbanFilters {
  boardType: BoardType
  search?: string
}

export function useKanbanProposals(filters: KanbanFilters) {
  return useQuery({
    queryKey: ['proposals', 'kanban', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(KANBAN_LIMIT) })
      if (filters.boardType) params.set('boardType', filters.boardType)
      if (filters.search) params.set('search', filters.search)

      const res = await api.get<ProposalData[]>(
        `/api/v1/proposals?${params.toString()}`
      )
      return res.data
    },
    staleTime: 30_000,
  })
}

export function groupByStage(
  proposals: ProposalData[]
): Record<ProposalStage, ProposalData[]> {
  const grouped: Record<string, ProposalData[]> = {}

  for (const stage of STAGES) {
    grouped[stage] = []
  }

  for (const proposal of proposals) {
    const stageGroup = grouped[proposal.stage]
    if (stageGroup) {
      stageGroup.push(proposal)
    }
  }

  return grouped as Record<ProposalStage, ProposalData[]>
}
