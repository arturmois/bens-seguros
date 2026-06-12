'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  createClient,
  deleteClient,
  getGetClientQueryKey,
  getListClientsQueryKey,
  updateClient,
  useGetClient,
  useListClients,
} from '@/api/endpoints/clients/clients'

import type {
  ListClients200DataItem,
  ListClients200Meta,
  ListClientsSortBy,
  ListClientsSortOrder,
  UpdateClientBody,
} from '@/api/model'

import { ApiError } from '@/lib/api-client'
import { extractErrorMessage } from '@/lib/extract-error-message'

import type { ClientFilters, ClientFormValues } from '../lib/types'
import { extractExistingClientId } from '../lib/validation'

interface ClientsQueryData {
  readonly data: ListClients200DataItem[]
  readonly meta: ListClients200Meta
}

export const CLIENTS_QUERY_KEY = getListClientsQueryKey

export function useClients(
  filters: ClientFilters & {
    sortBy?: ListClientsSortBy
    sortOrder?: ListClientsSortOrder
  }
) {
  return useListClients<ClientsQueryData>(filters, {
    query: {
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}

export function useClient(id: string) {
  return useGetClient(id, {
    query: {
      enabled: id.length > 0,
      select: (response) => response.data.data,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 404) return false
        return failureCount < 3
      },
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListClientsQueryKey(),
      })
      toast.success('Cliente excluído com sucesso')
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Erro ao excluir cliente')
      toast.error(message)
    },
  })
}

export function useCreateClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ClientFormValues) => createClient(values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListClientsQueryKey(),
      })
      toast.success('Cliente criado com sucesso')
    },
    onError: (error) => {
      const existingId = extractExistingClientId(error)
      if (existingId) {
        toast.error('Já existe um cliente com este documento', {
          action: {
            label: 'Abrir cliente existente',
            onClick: () => router.push(`/clients/${existingId}`),
          },
        })
        return
      }
      const message = extractErrorMessage(error, 'Erro ao criar cliente')
      toast.error(message)
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientBody }) =>
      updateClient(id, data),
    onSuccess: (_response, variables) => {
      toast.success('Cliente atualizado com sucesso')
      void queryClient.invalidateQueries({
        queryKey: getListClientsQueryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetClientQueryKey(variables.id),
      })
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Erro ao atualizar cliente')
      toast.error(message)
    },
  })
}
