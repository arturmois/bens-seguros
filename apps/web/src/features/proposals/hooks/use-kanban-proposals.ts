'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'

import type { BoardType, ProposalData, ProposalStage } from '../lib/constants'

export interface KanbanFilters {
  boardType: BoardType
  search?: string
}

interface KanbanPage {
  data: ProposalData[]
  meta: { nextCursor?: string | null }
}

export function useKanbanProposalsByStage(
  stage: ProposalStage,
  filters: KanbanFilters
) {
  return useInfiniteQuery({
    queryKey: ['proposals', 'kanban', stage, filters],
    queryFn: async ({ pageParam: cursor }) => {
      const params = new URLSearchParams({ limit: '20', stage })
      if (filters.boardType) params.set('boardType', filters.boardType)
      if (filters.search) params.set('search', filters.search)
      if (cursor) params.set('cursor', cursor)

      const res = await api.get<ProposalData[]>(
        `/api/v1/proposals?${params.toString()}`
      )
      return {
        data: res.data,
        meta: { nextCursor: res.meta?.nextCursor },
      } satisfies KanbanPage
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 30_000,
  })
}
