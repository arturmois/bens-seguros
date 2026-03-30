'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api-client'
import {
  getListAssistancesQueryKey,
  getGetAssistanceQueryKey,
  createAssistance,
  updateAssistanceStatus,
} from '@/api/endpoints/assistances/assistances'

import type {
  AssistanceData,
  AssistanceFilters,
  AssistanceListMeta,
  AssistanceStatus,
} from '../types'
import type { AssistanceFormValues } from '../lib/schemas'

export function useAssistances(filters: AssistanceFilters) {
  const params = {
    status: filters.status,
    policyId: filters.policyId,
    clientId: filters.clientId,
    type: filters.type,
    cursor: filters.cursor,
    limit: filters.limit ?? 20,
  }

  return useQuery({
    queryKey: getListAssistancesQueryKey(params),
    queryFn: async () => {
      const qs = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          qs.set(key, String(value))
        }
      }
      const response = await api.get<AssistanceData[]>(
        `/api/v1/assistances?${qs.toString()}`
      )
      return {
        data: response.data,
        meta: response.meta as AssistanceListMeta,
      }
    },
    staleTime: 60_000,
  })
}

export function useAssistance(id: string) {
  return useQuery({
    queryKey: getGetAssistanceQueryKey(id),
    queryFn: async () => {
      const response = await api.get<AssistanceData>(
        `/api/v1/assistances/${id}`
      )
      return response.data
    },
    staleTime: 60_000,
    enabled: id.length > 0,
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
