'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { ChecklistItem, ChecklistSummary } from '../types'

interface ChecklistResponse {
  items: ChecklistItem[]
  summary: ChecklistSummary
}

export function useChecklist(proposalId: string) {
  return useQuery({
    queryKey: ['proposal-checklist', proposalId],
    queryFn: async () => {
      const res = await api.get<ChecklistResponse>(
        `/api/v1/proposals/${proposalId}/checklist`
      )
      return res.data
    },
    staleTime: 30_000,
  })
}

export function useToggleChecklistItem(proposalId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await api.post<ChecklistItem>(
        `/api/v1/proposals/${proposalId}/checklist/${itemId}/toggle`,
        {}
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['proposal-checklist', proposalId],
      })
    },
  })
}

export function useCompleteChecklistItem(proposalId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await api.post<ChecklistItem>(
        `/api/v1/proposals/${proposalId}/checklist/${itemId}/complete`,
        {}
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['proposal-checklist', proposalId],
      })
    },
  })
}
