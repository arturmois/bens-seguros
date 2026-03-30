'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  useListAssistances,
  useGetAssistance,
  createAssistance,
  updateAssistanceStatus,
  getListAssistancesQueryKey,
  getGetAssistanceQueryKey,
} from '@/api/endpoints/assistances/assistances'

import type { z } from 'zod'

import { CreateAssistanceBody } from '@/api/endpoints/assistances/assistances.zod'

import type { AssistanceFilters, AssistanceStatus } from '../lib/constants'

type AssistanceFormValues = z.infer<typeof CreateAssistanceBody>

export function useAssistances(filters: AssistanceFilters) {
  const params = {
    status: filters.status,
    policyId: filters.policyId,
    clientId: filters.clientId,
    type: filters.type,
    cursor: filters.cursor,
    limit: filters.limit ?? 20,
  }

  return useListAssistances(params, {
    query: {
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}

export function useAssistance(id: string) {
  return useGetAssistance(id, {
    query: {
      enabled: id.length > 0,
      select: (response) => response.data.data,
    },
  })
}

export function useCreateAssistance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: AssistanceFormValues) => {
      return createAssistance(values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListAssistancesQueryKey(),
      })
      toast.success('Assistência registrada com sucesso')
    },
    onError: () => {
      toast.error('Erro ao registrar assistência')
    },
  })
}

export function useUpdateAssistanceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: AssistanceStatus
    }) => {
      return updateAssistanceStatus(id, { status })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getListAssistancesQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getGetAssistanceQueryKey(variables.id),
      })
      toast.success('Status da assistência atualizado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao atualizar status da assistência')
    },
  })
}
