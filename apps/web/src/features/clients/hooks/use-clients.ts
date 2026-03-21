'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

import type { ClientData, ClientFilters, ClientListMeta } from '../types';
import type { ClientFormValues } from '../lib/schemas';

const CLIENTS_KEY = 'clients';
const CLIENT_KEY = 'client';

function buildClientsUrl(filters: ClientFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.type) params.set('type', filters.type);
  if (filters.cursor) params.set('cursor', filters.cursor);
  params.set('limit', String(filters.limit ?? 20));

  return `/api/v1/clients?${params.toString()}`;
}

export function useClients(filters: ClientFilters) {
  return useQuery({
    queryKey: [CLIENTS_KEY, filters],
    queryFn: async () => {
      const response = await api.get<ClientData[]>(buildClientsUrl(filters));
      return {
        data: response.data,
        meta: response.meta as ClientListMeta,
      };
    },
    staleTime: 60_000,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [CLIENT_KEY, id],
    queryFn: async () => {
      const response = await api.get<ClientData>(`/api/v1/clients/${id}`);
      return response.data;
    },
    staleTime: 60_000,
    enabled: id.length > 0,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const response = await api.post<ClientData>('/api/v1/clients', values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] });
      toast.success('Cliente criado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar cliente');
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ClientFormValues }) => {
      const response = await api.put<ClientData>(`/api/v1/clients/${id}`, values);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [CLIENT_KEY, variables.id],
      });
      toast.success('Cliente atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar cliente');
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] });
      toast.success('Cliente excluido com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir cliente');
    },
  });
}
