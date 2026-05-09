'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'

import type { BoardType, ProposalData, ProposalStage } from '../lib/constants'

export interface KanbanFilters {
  boardType: BoardType
  search?: string
  insurerId?: string
  salespersonId?: string
  branchIn?: string
  salespersonIdIn?: string
  createdFrom?: string
  createdTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
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
      if (filters.insurerId) params.set('insurerId', filters.insurerId)
      if (filters.salespersonId)
        params.set('salespersonId', filters.salespersonId)
      if (filters.branchIn) params.set('branchIn', filters.branchIn)
      if (filters.salespersonIdIn)
        params.set('salespersonIdIn', filters.salespersonIdIn)
      if (filters.createdFrom) params.set('createdFrom', filters.createdFrom)
      if (filters.createdTo) params.set('createdTo', filters.createdTo)
      if (filters.updatedAtFrom)
        params.set('updatedAtFrom', filters.updatedAtFrom)
      if (filters.updatedAtTo) params.set('updatedAtTo', filters.updatedAtTo)
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
