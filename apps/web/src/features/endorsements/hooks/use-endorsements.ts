'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  useListEndorsements,
  createEndorsement,
  getListEndorsementsQueryKey,
} from '@/api/endpoints/endorsements/endorsements'
import type { CreateEndorsementBody } from '@/api/model'

import type { EndorsementFilters } from '../lib/constants'

export function useEndorsements(filters: EndorsementFilters) {
  const params = {
    policyId: filters.policyId,
    cursor: filters.cursor,
    limit: filters.limit ?? 20,
  }

  return useListEndorsements(params, {
    query: {
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
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
