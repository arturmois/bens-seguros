'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api-client'
import {
  getListEndorsementsQueryKey,
  createEndorsement,
} from '@/api/endpoints/endorsements/endorsements'
import type { CreateEndorsementBody } from '@/api/model'

import type {
  EndorsementData,
  EndorsementFilters,
  EndorsementListMeta,
} from '../types'

export function useEndorsements(filters: EndorsementFilters) {
  const params = {
    policyId: filters.policyId,
    cursor: filters.cursor,
    limit: filters.limit ?? 20,
  }

  return useQuery({
    queryKey: getListEndorsementsQueryKey(params),
    queryFn: async () => {
      const qs = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          qs.set(key, String(value))
        }
      }
      const response = await api.get<EndorsementData[]>(
        `/api/v1/endorsements?${qs.toString()}`
      )
      return {
        data: response.data,
        meta: response.meta as EndorsementListMeta,
      }
    },
    staleTime: 60_000,
  })
}

export function useCreateEndorsement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: CreateEndorsementBody) => {
      return createEndorsement(values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListEndorsementsQueryKey(),
      })
      toast.success('Endosso registrado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao registrar endosso')
    },
  })
}
