'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  useGetProposalChecklist,
  completeProposalChecklistItem,
  getGetProposalChecklistQueryKey,
} from '@/api/endpoints/proposals/proposals'

export function useChecklist(proposalId: string) {
  return useGetProposalChecklist(proposalId, {
    query: {
      staleTime: 30_000,
      select: (response) =>
        'data' in response.data ? response.data.data : undefined,
    },
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
    onError: () => {
      toast.error('Erro ao completar item do checklist')
    },
  })
}
