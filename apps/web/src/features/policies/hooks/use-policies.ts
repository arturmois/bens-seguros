'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

import type { PolicyData, PolicyStatus } from '../types';

interface PoliciesFilters {
  status?: PolicyStatus;
  clientId?: string;
  branch?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

interface PoliciesMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

interface PoliciesResult {
  data: PolicyData[];
  meta: PoliciesMeta;
}

interface PolicyResult {
  data: PolicyData;
}

const POLICIES_KEY = 'policies';

export function usePolicies(filters: PoliciesFilters = {}) {
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.branch) params.set('branch', filters.branch);
  if (filters.search) params.set('search', filters.search);
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();
  const url = queryString ? `/api/v1/policies?${queryString}` : '/api/v1/policies';

  return useQuery<PoliciesResult>({
    queryKey: [POLICIES_KEY, filters],
    queryFn: async () => {
      const response = await api.get<PolicyData[]>(url);
      return {
        data: response.data,
        meta: {
          nextCursor: response.meta?.nextCursor ?? null,
          hasMore: response.meta?.nextCursor !== null && response.meta?.nextCursor !== undefined,
        },
      };
    },
    staleTime: 60_000,
  });
}

export function usePolicy(id: string) {
  return useQuery<PolicyResult>({
    queryKey: [POLICIES_KEY, id],
    queryFn: async () => {
      const response = await api.get<PolicyData>(`/api/v1/policies/${id}`);
      return { data: response.data };
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

interface IssuePolicyInput {
  proposalId: string;
  policyNumber: string;
  startDate: string;
  endDate: string;
}

export function useIssuePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: IssuePolicyInput) => {
      const response = await api.post<PolicyData>('/api/v1/policies', values);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [POLICIES_KEY] });
      toast.success('Apólice emitida com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao emitir apólice. Verifique os dados e tente novamente.');
    },
  });
}

export function useCancelPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/api/v1/policies/${id}/cancel`, { reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [POLICIES_KEY] });
      toast.success('Apólice cancelada com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao cancelar apólice. Tente novamente.');
    },
  });
}
