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
import type {
  ListAssistances200DataItem,
  ListAssistances200Meta,
  ListAssistancesSortBy,
  ListAssistancesSortOrder,
} from '@/api/model'
import { extractErrorMessage } from '@/lib/extract-error-message'

import type { z } from 'zod'
import { CreateAssistanceBody } from '@/api/endpoints/assistances/assistances.zod'

import type { AssistanceFilters, AssistanceStatus } from '../lib/types'

type AssistanceFormValues = z.infer<typeof CreateAssistanceBody>

interface AssistancesQueryData {
  readonly data: ListAssistances200DataItem[]
  readonly meta: ListAssistances200Meta
}

const ASSISTANCES_LIST_KEY = getListAssistancesQueryKey()

export function useAssistances(
  filters: AssistanceFilters & {
    sortBy?: ListAssistancesSortBy
    sortOrder?: ListAssistancesSortOrder
  }
) {
  return useListAssistances<AssistancesQueryData>(filters, {
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
    mutationFn: (values: AssistanceFormValues) => createAssistance(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ASSISTANCES_LIST_KEY })
      toast.success('Assistência registrada com sucesso')
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Erro ao registrar assistência'))
    },
  })
}

export function useUpdateAssistanceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AssistanceStatus }) =>
      updateAssistanceStatus(id, { status }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ASSISTANCES_LIST_KEY })
      void queryClient.invalidateQueries({
        queryKey: getGetAssistanceQueryKey(variables.id),
      })
      toast.success('Status da assistência atualizado com sucesso')
    },
    onError: (error) => {
      toast.error(
        extractErrorMessage(error, 'Erro ao atualizar status da assistência')
      )
    },
  })
}
