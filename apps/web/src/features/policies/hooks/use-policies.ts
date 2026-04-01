'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  useListPolicies,
  useGetPolicy,
  issuePolicy,
  cancelPolicy,
  getListPoliciesQueryKey,
} from '@/api/endpoints/policies/policies'
import type { ListPoliciesParams } from '@/api/model'

export function usePolicies(filters: ListPoliciesParams = {}) {
  return useListPolicies(filters, {
    query: {
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}

export function usePolicy(id: string) {
  return useGetPolicy(id, {
    query: {
      enabled: Boolean(id),
      select: (response) => ({ data: response.data.data }),
    },
  })
}

export function useIssuePolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: {
      proposalId: string
      policyNumber: string
      startDate: string
      endDate: string
      insurerId?: string
    }) => {
      const response = await issuePolicy(values)
      return response.data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getListPoliciesQueryKey(),
      })
      toast.success('Apólice emitida com sucesso!')
    },
    onError: () => {
      toast.error(
        'Erro ao emitir apólice. Verifique os dados e tente novamente.'
      )
    },
  })
}

export function usePolicyByProposal(proposalId: string) {
  return useListPolicies(
    { proposalId, limit: 1 },
    {
      query: {
        select: (response) => response.data.data?.[0] ?? null,
        enabled: Boolean(proposalId),
        staleTime: 60_000,
      },
    }
  )
}

export function useCancelPolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelPolicy(id, { reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getListPoliciesQueryKey(),
      })
      toast.success('Apólice cancelada com sucesso.')
    },
    onError: () => {
      toast.error('Erro ao cancelar apólice. Tente novamente.')
    },
  })
}
