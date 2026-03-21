'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

import type { BoardType, ProposalData, ProposalStage } from '../types';

interface ProposalFilters {
  stage?: ProposalStage;
  boardType?: BoardType;
  search?: string;
  clientId?: string;
  cursor?: string;
  limit?: number;
}

interface PaginatedResult {
  data: ProposalData[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

interface SingleResult {
  data: ProposalData;
}

interface CreateProposalInput {
  clientId: string;
  branch: string;
  boardType: string;
  premiumValueInCents?: number;
  commissionPercentageInCents?: number;
}

const PROPOSALS_KEY = ['proposals'] as const;

function proposalKey(id: string) {
  return ['proposal', id] as const;
}

export function useProposals(filters: ProposalFilters) {
  const params = new URLSearchParams();

  if (filters.stage) params.set('stage', filters.stage);
  if (filters.boardType) params.set('boardType', filters.boardType);
  if (filters.search) params.set('search', filters.search);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();
  const url = queryString ? `/api/v1/proposals?${queryString}` : '/api/v1/proposals';

  return useQuery<PaginatedResult>({
    queryKey: [...PROPOSALS_KEY, filters],
    queryFn: async () => {
      const response = await api.get<ProposalData[]>(url);
      return {
        data: response.data,
        meta: {
          nextCursor: response.meta?.nextCursor ?? null,
          hasMore: response.meta?.nextCursor !== null && response.meta?.nextCursor !== undefined,
        },
      };
    },
  });
}

export function useProposal(id: string) {
  return useQuery<SingleResult>({
    queryKey: proposalKey(id),
    queryFn: async () => {
      const response = await api.get<ProposalData>(`/api/v1/proposals/${id}`);
      return { data: response.data };
    },
    enabled: Boolean(id),
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProposalInput) => api.post<ProposalData>('/api/v1/proposals', data),
    onSuccess: () => {
      toast.success('Proposta criada com sucesso');
      void queryClient.invalidateQueries({ queryKey: PROPOSALS_KEY });
    },
    onError: () => {
      toast.error('Erro ao criar proposta');
    },
  });
}

export function useAdvanceProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<ProposalData>(`/api/v1/proposals/${id}/advance`, {}),
    onSuccess: (_data, id) => {
      toast.success('Estágio avançado com sucesso');
      void queryClient.invalidateQueries({ queryKey: PROPOSALS_KEY });
      void queryClient.invalidateQueries({ queryKey: proposalKey(id) });
    },
    onError: () => {
      toast.error('Erro ao avançar estágio');
    },
  });
}

export function useRevertProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<ProposalData>(`/api/v1/proposals/${id}/revert`, {}),
    onSuccess: (_data, id) => {
      toast.success('Estágio revertido com sucesso');
      void queryClient.invalidateQueries({ queryKey: PROPOSALS_KEY });
      void queryClient.invalidateQueries({ queryKey: proposalKey(id) });
    },
    onError: () => {
      toast.error('Erro ao reverter estágio');
    },
  });
}

interface MarkLostInput {
  id: string;
  reason: string;
}

export function useMarkProposalLost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: MarkLostInput) =>
      api.post<ProposalData>(`/api/v1/proposals/${id}/lost`, { reason }),
    onSuccess: (_data, { id }) => {
      toast.success('Proposta marcada como perda');
      void queryClient.invalidateQueries({ queryKey: PROPOSALS_KEY });
      void queryClient.invalidateQueries({ queryKey: proposalKey(id) });
    },
    onError: () => {
      toast.error('Erro ao marcar proposta como perda');
    },
  });
}
