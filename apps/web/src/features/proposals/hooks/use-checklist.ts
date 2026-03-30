'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getGetProposalChecklistQueryOptions,
  getGetProposalChecklistQueryKey,
  completeProposalChecklistItem,
} from '@/api/endpoints/proposals/proposals'
import { api } from '@/lib/api-client'

import type { ChecklistItem, ChecklistSummary } from '../types'

interface ChecklistResponse {
  items: ChecklistItem[]
  summary: ChecklistSummary
}

export function useChecklist(proposalId: string) {
  const orvalOptions = getGetProposalChecklistQueryOptions(proposalId)

  return useQuery({
    queryKey: orvalOptions.queryKey,
    queryFn: async () => {
      const res = await api.get<ChecklistResponse>(
        `/api/v1/proposals/${proposalId}/checklist`
      )
      return res.data
    },
    staleTime: 30_000,
  })
}

export function useCompleteChecklistItem(proposalId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) =>
      completeProposalChecklistItem(proposalId, itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getGetProposalChecklistQueryKey(proposalId),
      })
    },
  })
}
