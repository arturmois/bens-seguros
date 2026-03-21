'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

import type { EndorsementData, EndorsementFilters, EndorsementListMeta } from '../types';

const ENDORSEMENTS_KEY = 'endorsements';

function buildEndorsementsUrl(filters: EndorsementFilters): string {
  const params = new URLSearchParams();

  if (filters.policyId) params.set('policyId', filters.policyId);
  if (filters.cursor) params.set('cursor', filters.cursor);
  params.set('limit', String(filters.limit ?? 20));

  return `/api/v1/endorsements?${params.toString()}`;
}

export function useEndorsements(filters: EndorsementFilters) {
  return useQuery({
    queryKey: [ENDORSEMENTS_KEY, filters],
    queryFn: async () => {
      const response = await api.get<EndorsementData[]>(buildEndorsementsUrl(filters));
      return {
        data: response.data,
        meta: response.meta as EndorsementListMeta,
      };
    },
    staleTime: 60_000,
  });
}

interface CreateEndorsementInput {
  readonly policyId: string;
  readonly type: string;
  readonly description: string;
  readonly effectiveDate: string;
  readonly previousVersionSnapshot: Record<string, unknown>;
  readonly changes: Record<string, unknown>;
}

export function useCreateEndorsement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateEndorsementInput) => {
      const response = await api.post<EndorsementData>('/api/v1/endorsements', values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENDORSEMENTS_KEY] });
      toast.success('Endosso registrado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao registrar endosso');
    },
  });
}
