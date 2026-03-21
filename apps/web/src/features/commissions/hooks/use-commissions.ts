'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

import type { CommissionData, CommissionFilters, CommissionListMeta } from '../types';

const COMMISSIONS_KEY = 'commissions';
const COMMISSION_KEY = 'commission';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function buildFilterParams(filters: CommissionFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.salespersonId) params.set('salespersonId', filters.salespersonId);
  if (filters.policyId) params.set('policyId', filters.policyId);
  if (filters.search) params.set('search', filters.search);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  return params;
}

function buildCommissionsUrl(filters: CommissionFilters): string {
  const params = buildFilterParams(filters);
  if (filters.cursor) params.set('cursor', filters.cursor);
  params.set('limit', String(filters.limit ?? 20));
  return `/api/v1/commissions?${params.toString()}`;
}

export function useCommissions(filters: CommissionFilters) {
  return useQuery({
    queryKey: [COMMISSIONS_KEY, filters],
    queryFn: async () => {
      const response = await api.get<CommissionData[]>(buildCommissionsUrl(filters));
      return {
        data: response.data,
        meta: response.meta as CommissionListMeta,
      };
    },
    staleTime: 60_000,
  });
}

export function useCommission(id: string) {
  return useQuery({
    queryKey: [COMMISSION_KEY, id],
    queryFn: async () => {
      const response = await api.get<CommissionData>(`/api/v1/commissions/${id}`);
      return response.data;
    },
    staleTime: 60_000,
    enabled: id.length > 0,
  });
}

export function useApproveCommercial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CommissionData>(
        `/api/v1/commissions/${id}/approve-commercial`,
        {},
      );
      return response.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [COMMISSIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMMISSION_KEY, id] });
      toast.success('Aprovação comercial realizada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao aprovar comissão');
    },
  });
}

export function useApproveAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CommissionData>(
        `/api/v1/commissions/${id}/approve-admin`,
        {},
      );
      return response.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [COMMISSIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMMISSION_KEY, id] });
      toast.success('Aprovação administrativa realizada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao aprovar comissão');
    },
  });
}

export function useRejectCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post<CommissionData>(`/api/v1/commissions/${id}/reject`, {
        reason,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [COMMISSIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMMISSION_KEY, variables.id] });
      toast.success('Comissão rejeitada');
    },
    onError: () => {
      toast.error('Erro ao rejeitar comissão');
    },
  });
}

export function usePayCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CommissionData>(`/api/v1/commissions/${id}/pay`, {});
      return response.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [COMMISSIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMMISSION_KEY, id] });
      toast.success('Comissão marcada como paga');
    },
    onError: () => {
      toast.error('Erro ao marcar comissão como paga');
    },
  });
}

export function useReverseCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CommissionData>(`/api/v1/commissions/${id}/reverse`, {});
      return response.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [COMMISSIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMMISSION_KEY, id] });
      toast.success('Comissão estornada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao estornar comissão');
    },
  });
}

export function useExportCommissionsCsv() {
  return useMutation({
    mutationFn: async (filters: CommissionFilters) => {
      const params = buildFilterParams(filters);
      const response = await fetch(`${API_URL}/api/v1/commissions/export?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Falha ao exportar comissões');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'comissoes.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Exportação concluída');
    },
    onError: () => {
      toast.error('Erro ao exportar comissões');
    },
  });
}
