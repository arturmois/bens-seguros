'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'

import type { BoardType, ProposalData, ProposalStage } from '../types'

const KANBAN_LIMIT = 100

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
  const grouped: Record<ProposalStage, ProposalData[]> = {
    CAPTURE: [],
    QUOTE: [],
    PROTOCOL: [],
    INSPECTION: [],
    PAYMENT: [],
    POLICY_ISSUED: [],
    LOST: [],
  }

  for (const proposal of proposals) {
    grouped[proposal.stage].push(proposal)
  }

  return grouped
}
