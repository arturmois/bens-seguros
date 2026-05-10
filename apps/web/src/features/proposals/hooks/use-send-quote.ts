'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getGetProposalQueryKey } from '@/api/endpoints/proposals/proposals'
import { api } from '@/lib/api-client'

const INVALIDATION_DELAY_MS = 3000

export function useSendQuote(proposalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post(`/api/v1/proposals/${proposalId}/send-quote`, {}),
    onSuccess: () => {
      toast.success('Cotação sendo enviada...')
      setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: getGetProposalQueryKey(proposalId),
        })
      }, INVALIDATION_DELAY_MS)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
