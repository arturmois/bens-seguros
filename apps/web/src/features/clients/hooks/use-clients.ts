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

import type { z } from 'zod'

import { CreateClientBody } from '@/api/endpoints/clients/clients.zod'

import type {
  ListClients200DataItem,
  ListClients200Meta,
  ListClientsSortBy,
  ListClientsSortOrder,
} from '@/api/model'

import type { ClientFilters } from '../lib/constants'

type ClientFormValues = z.infer<typeof CreateClientBody>

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
    onError: () => {
      toast.error('Erro ao criar cliente')
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
    onError: () => {
      toast.error('Erro ao atualizar cliente')
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
    onError: () => {
      toast.error('Erro ao excluir cliente')
    },
  })
}
