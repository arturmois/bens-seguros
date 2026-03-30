'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getGetCommissionQueryOptions,
  getListCommissionsUrl,
  approveCommissionCommercial,
  approveCommissionAdmin,
  rejectCommission,
  payCommission,
  reverseCommission,
} from '@/api/endpoints/commissions/commissions'
import { api } from '@/lib/api-client'
import { downloadCsvBlob } from '@/lib/csv-download'

import type {
  CommissionData,
  CommissionFilters,
  CommissionListMeta,
} from '../types'

const COMMISSIONS_LIST_KEY = '/api/v1/commissions' as const

export function useCommissions(filters: CommissionFilters) {
  return useQuery({
    queryKey: [COMMISSIONS_LIST_KEY, filters],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {
        status: filters.status,
        salespersonId: filters.salespersonId,
        policyId: filters.policyId,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        cursor: filters.cursor,
        limit: filters.limit ?? 20,
      }
      const response = await api.get<CommissionData[]>(
        getListCommissionsUrl(params)
      )
      return {
        data: response.data,
        meta: response.meta as CommissionListMeta,
      }
    },
    staleTime: 60_000,
  })
}

export function useCommission(id: string) {
  const orvalOptions = getGetCommissionQueryOptions(id)

  return useQuery({
    queryKey: orvalOptions.queryKey,
    queryFn: async () => {
      const response = await api.get<CommissionData>(
        `/api/v1/commissions/${id}`
      )
      return response.data
    },
    staleTime: 60_000,
    enabled: id.length > 0,
  })
}

export function useApproveCommercial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => approveCommissionCommercial(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: [COMMISSIONS_LIST_KEY],
      })
      void queryClient.invalidateQueries({
        queryKey: [`/api/v1/commissions/${id}`],
      })
      toast.success('Aprovação comercial realizada com sucesso')
    },
    onError: () => {
      toast.error('Erro ao aprovar comissão')
    },
  })
}

export function useApproveAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => approveCommissionAdmin(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: [COMMISSIONS_LIST_KEY],
      })
      void queryClient.invalidateQueries({
        queryKey: [`/api/v1/commissions/${id}`],
      })
      toast.success('Aprovação administrativa realizada com sucesso')
    },
    onError: () => {
      toast.error('Erro ao aprovar comissão')
    },
  })
}

export function useRejectCommission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectCommission(id, { reason }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [COMMISSIONS_LIST_KEY],
      })
      void queryClient.invalidateQueries({
        queryKey: [`/api/v1/commissions/${variables.id}`],
      })
      toast.success('Comissão rejeitada')
    },
    onError: () => {
      toast.error('Erro ao rejeitar comissão')
    },
  })
}

export function usePayCommission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => payCommission(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: [COMMISSIONS_LIST_KEY],
      })
      void queryClient.invalidateQueries({
        queryKey: [`/api/v1/commissions/${id}`],
      })
      toast.success('Comissão marcada como paga')
    },
    onError: () => {
      toast.error('Erro ao marcar comissão como paga')
    },
  })
}

export function useReverseCommission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reverseCommission(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: [COMMISSIONS_LIST_KEY],
      })
      void queryClient.invalidateQueries({
        queryKey: [`/api/v1/commissions/${id}`],
      })
      toast.success('Comissão estornada com sucesso')
    },
    onError: () => {
      toast.error('Erro ao estornar comissão')
    },
  })
}

function buildFilterParams(filters: CommissionFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.salespersonId) params.set('salespersonId', filters.salespersonId)
  if (filters.policyId) params.set('policyId', filters.policyId)
  if (filters.search) params.set('search', filters.search)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  return params
}

export function useExportCommissionsCsv() {
  return useMutation({
    mutationFn: async (filters: CommissionFilters) => {
      const params = buildFilterParams(filters)
      await downloadCsvBlob(
        `/api/v1/commissions/export?${params.toString()}`,
        'comissoes.csv'
      )
    },
    onSuccess: () => {
      toast.success('Exportação concluída')
    },
    onError: () => {
      toast.error('Erro ao exportar comissões')
    },
  })
}
