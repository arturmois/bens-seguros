'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
} from '@/api/model'

import type { ClientFilters, ClientFormValues } from '../lib/types'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    const data = error.response.data as { error?: { message?: string } }
    if (data.error?.message) return data.error.message
  }
  return fallback
}

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
    },
  })
}

export function useCreateClient() {
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
      const message = extractErrorMessage(error, 'Erro ao criar cliente')
      toast.error(message)
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ClientFormValues }) =>
      updateClient(id, values),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getListClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getGetClientQueryKey(variables.id),
      })
      toast.success('Cliente atualizado com sucesso')
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Erro ao atualizar cliente')
      toast.error(message)
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
