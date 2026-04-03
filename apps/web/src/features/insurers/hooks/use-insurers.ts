'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api-client'
import {
  createInsurer,
  getListInsurersQueryKey,
  updateInsurer,
  useListInsurers,
} from '@/api/endpoints/insurers/insurers'
import type {
  CreateInsurerBody,
  ListInsurers200DataItem,
  ListInsurers200Meta,
  ListInsurersParams,
  UpdateInsurerBody,
} from '@/api/model'

export type InsurerItem = ListInsurers200DataItem
export type InsurerStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export interface InsurersListData {
  readonly data: readonly ListInsurers200DataItem[]
  readonly meta: ListInsurers200Meta
}

export function useInsurers(filters: ListInsurersParams = {}) {
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

function handleInsurerError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code === 'INSURER_ALREADY_EXISTS') {
    toast.error(error.message)
    return
  }

  toast.error(fallback)
}

export function useCreateInsurerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateInsurerBody) => {
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
      body: UpdateInsurerBody
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
