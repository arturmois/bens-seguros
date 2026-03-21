'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

import type {
  AssistanceData,
  AssistanceFilters,
  AssistanceListMeta,
  AssistanceStatus,
} from '../types';
import type { AssistanceFormValues } from '../lib/schemas';

const ASSISTANCES_KEY = 'assistances';
const ASSISTANCE_KEY = 'assistance';

function buildAssistancesUrl(filters: AssistanceFilters): string {
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.policyId) params.set('policyId', filters.policyId);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.type) params.set('type', filters.type);
  if (filters.cursor) params.set('cursor', filters.cursor);
  params.set('limit', String(filters.limit ?? 20));

  return `/api/v1/assistances?${params.toString()}`;
}

export function useAssistances(filters: AssistanceFilters) {
  return useQuery({
    queryKey: [ASSISTANCES_KEY, filters],
    queryFn: async () => {
      const response = await api.get<AssistanceData[]>(buildAssistancesUrl(filters));
      return {
        data: response.data,
        meta: response.meta as AssistanceListMeta,
      };
    },
    staleTime: 60_000,
  });
}

export function useAssistance(id: string) {
  return useQuery({
    queryKey: [ASSISTANCE_KEY, id],
    queryFn: async () => {
      const response = await api.get<AssistanceData>(`/api/v1/assistances/${id}`);
      return response.data;
    },
    staleTime: 60_000,
    enabled: id.length > 0,
  });
}

export function useCreateAssistance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: AssistanceFormValues) => {
      const response = await api.post<AssistanceData>('/api/v1/assistances', values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSISTANCES_KEY] });
      toast.success('Assistência registrada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao registrar assistência');
    },
  });
}

export function useUpdateAssistanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AssistanceStatus }) => {
      const response = await api.post<AssistanceData>(`/api/v1/assistances/${id}/status`, {
        status,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [ASSISTANCES_KEY] });
      queryClient.invalidateQueries({ queryKey: [ASSISTANCE_KEY, variables.id] });
      toast.success('Status da assistência atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar status da assistência');
    },
  });
}
