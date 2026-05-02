'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  deleteClient,
  getListClientsQueryKey,
  useGetClient,
  useListClients,
} from '@/api/endpoints/clients/clients'

import type {
  ListClients200DataItem,
  ListClients200Meta,
  ListClientsSortBy,
  ListClientsSortOrder,
} from '@/api/model'

import { extractErrorMessage } from '@/lib/extract-error-message'

import type { ClientFilters } from '../lib/types'

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
