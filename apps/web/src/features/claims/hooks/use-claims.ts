'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

import type { ClaimData, ClaimFilters, ClaimListMeta, ClaimStatus, OccurrenceData } from '../types';
import type { ClaimFormValues } from '../lib/schemas';

const CLAIMS_KEY = 'claims';
const CLAIM_KEY = 'claim';
const OCCURRENCES_KEY = 'occurrences';

function buildClaimsUrl(filters: ClaimFilters): string {
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.policyId) params.set('policyId', filters.policyId);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.search) params.set('search', filters.search);
  if (filters.cursor) params.set('cursor', filters.cursor);
  params.set('limit', String(filters.limit ?? 20));

  return `/api/v1/claims?${params.toString()}`;
}

export function useClaims(filters: ClaimFilters) {
  return useQuery({
    queryKey: [CLAIMS_KEY, filters],
    queryFn: async () => {
      const response = await api.get<ClaimData[]>(buildClaimsUrl(filters));
      return {
        data: response.data,
        meta: response.meta as ClaimListMeta,
      };
    },
    staleTime: 60_000,
  });
}

export function useClaim(id: string) {
  return useQuery({
    queryKey: [CLAIM_KEY, id],
    queryFn: async () => {
      const response = await api.get<ClaimData>(`/api/v1/claims/${id}`);
      return response.data;
    },
    staleTime: 60_000,
    enabled: id.length > 0,
  });
}

export function useCreateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ClaimFormValues) => {
      const response = await api.post<ClaimData>('/api/v1/claims', values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLAIMS_KEY] });
      toast.success('Sinistro registrado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao registrar sinistro');
    },
  });
}

export function useUpdateClaimStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ClaimStatus }) => {
      const response = await api.post<ClaimData>(`/api/v1/claims/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [CLAIMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CLAIM_KEY, variables.id] });
      toast.success('Status do sinistro atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar status do sinistro');
    },
  });
}

export function useDeleteClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/claims/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLAIMS_KEY] });
      toast.success('Sinistro excluído com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir sinistro');
    },
  });
}

export function useClaimOccurrences(claimId: string) {
  return useQuery({
    queryKey: [OCCURRENCES_KEY, claimId],
    queryFn: async () => {
      const response = await api.get<OccurrenceData[]>(`/api/v1/claims/${claimId}/occurrences`);
      return response.data;
    },
    staleTime: 60_000,
    enabled: claimId.length > 0,
  });
}

export function useCreateOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      claimId,
      type,
      description,
      metadata,
    }: {
      claimId: string;
      type: string;
      description: string;
      metadata?: Record<string, unknown>;
    }) => {
      const response = await api.post<OccurrenceData>(`/api/v1/claims/${claimId}/occurrences`, {
        type,
        description,
        metadata,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [OCCURRENCES_KEY, variables.claimId] });
      toast.success('Ocorrência registrada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao registrar ocorrência');
    },
  });
}
