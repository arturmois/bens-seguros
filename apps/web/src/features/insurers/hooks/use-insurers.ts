'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  createInsurer,
  getGetInsurerQueryKey,
  getListInsurersQueryKey,
  updateInsurer,
  useGetInsurer,
  useListInsurers,
} from '@/api/endpoints/insurers/insurers'
import { ApiError } from '@/lib/api-client'
import { extractErrorMessage } from '@/lib/extract-error-message'

import type {
  InsurerCreateBody,
  InsurerListParams,
  InsurersListData,
  InsurerUpdateBody,
} from '../lib/types'

export function useInsurers(filters: InsurerListParams = {}) {
  return useListInsurers<InsurersListData>(filters, {
    query: {
      queryKey: getListInsurersQueryKey(filters),
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}

export function useInsurer(id: string) {
  return useGetInsurer(id, {
    query: {
      queryKey: getGetInsurerQueryKey(id),
      select: (response) => response.data.data,
      enabled: Boolean(id),
    },
  })
}

function handleInsurerError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code === 'INSURER_ALREADY_EXISTS') {
    toast.error(error.message)
    return
  }
  toast.error(extractErrorMessage(error, fallback))
}

export function useCreateInsurerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: InsurerCreateBody) => {
      const response = await createInsurer(body)
      return response.data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getListInsurersQueryKey(),
      })
      toast.success('Seguradora criada com sucesso')
    },
    onError: (error) => handleInsurerError(error, 'Erro ao criar seguradora'),
  })
}

export function useUpdateInsurerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: InsurerUpdateBody
    }) => {
      const response = await updateInsurer(id, body)
      return response.data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getListInsurersQueryKey(),
      })
      toast.success('Seguradora atualizada com sucesso')
    },
    onError: (error) =>
      handleInsurerError(error, 'Erro ao atualizar seguradora'),
  })
}
