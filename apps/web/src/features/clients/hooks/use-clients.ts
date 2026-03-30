'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  useListClients,
  useGetClient,
  createClient,
  updateClient,
  deleteClient,
  getListClientsQueryKey,
  getGetClientQueryKey,
} from '@/api/endpoints/clients/clients'

import type { z } from 'zod'

import { CreateClientBody } from '@/api/endpoints/clients/clients.zod'

import type { ClientFilters } from '../lib/constants'

type ClientFormValues = z.infer<typeof CreateClientBody>

export const CLIENTS_QUERY_KEY = getListClientsQueryKey

export function useClients(filters: ClientFilters) {
  return useListClients(filters, {
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
