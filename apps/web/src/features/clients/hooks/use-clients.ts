'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api-client'
import {
  getListClientsQueryKey,
  getGetClientQueryKey,
  getListClientsUrl,
  getGetClientUrl,
  createClient,
  updateClient,
  deleteClient,
} from '@/api/endpoints/clients/clients'

import type { ClientData, ClientFilters, ClientListMeta } from '../types'
import type { ClientFormValues } from '../lib/schemas'

export const CLIENTS_QUERY_KEY = getListClientsQueryKey

export function useClients(filters: ClientFilters) {
  return useQuery({
    queryKey: getListClientsQueryKey(filters),
    queryFn: async () => {
      const response = await api.get<ClientData[]>(getListClientsUrl(filters))
      return {
        data: response.data,
        meta: response.meta as ClientListMeta,
      }
    },
    staleTime: 60_000,
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: getGetClientQueryKey(id),
    queryFn: async () => {
      const response = await api.get<ClientData>(getGetClientUrl(id))
      return response.data
    },
    staleTime: 60_000,
    enabled: id.length > 0,
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
