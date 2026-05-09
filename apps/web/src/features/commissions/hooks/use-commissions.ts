'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  useListCommissions,
  useGetCommission,
  approveCommissionCommercial,
  approveCommissionAdmin,
  rejectCommission,
  payCommission,
  reverseCommission,
  getListCommissionsQueryKey,
  getGetCommissionQueryKey,
} from '@/api/endpoints/commissions/commissions'
import type {
  ListCommissions200DataItem,
  ListCommissions200Meta,
  ListCommissionsSortBy,
  ListCommissionsSortOrder,
} from '@/api/model'
import { downloadCsvBlob } from '@/lib/csv-download'
import { extractErrorMessage } from '@/lib/extract-error-message'

import type { CommissionFilters } from '../lib/types'

interface CommissionsQueryData {
  readonly data: ListCommissions200DataItem[]
  readonly meta: ListCommissions200Meta
}

const COMMISSIONS_LIST_KEY = getListCommissionsQueryKey()

export function useCommissions(
  filters: CommissionFilters & {
    sortBy?: ListCommissionsSortBy
    sortOrder?: ListCommissionsSortOrder
  }
) {
  return useListCommissions<CommissionsQueryData>(filters, {
    query: {
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}

export function useCommission(id: string) {
  return useGetCommission(id, {
    query: {
      enabled: id.length > 0,
      select: (response) => response.data.data,
    },
  })
}

export function useApproveCommercial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => approveCommissionCommercial(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: COMMISSIONS_LIST_KEY,
      })
      void queryClient.invalidateQueries({
        queryKey: getGetCommissionQueryKey(id),
      })
      toast.success('Aprovação comercial realizada com sucesso')
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Erro ao aprovar comissão'))
    },
  })
}

export function useApproveAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => approveCommissionAdmin(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: COMMISSIONS_LIST_KEY,
      })
      void queryClient.invalidateQueries({
        queryKey: getGetCommissionQueryKey(id),
      })
      toast.success('Aprovação administrativa realizada com sucesso')
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Erro ao aprovar comissão'))
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
        queryKey: COMMISSIONS_LIST_KEY,
      })
      void queryClient.invalidateQueries({
        queryKey: getGetCommissionQueryKey(variables.id),
      })
      toast.success('Comissão rejeitada')
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Erro ao rejeitar comissão'))
    },
  })
}

export function usePayCommission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => payCommission(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: COMMISSIONS_LIST_KEY,
      })
      void queryClient.invalidateQueries({
        queryKey: getGetCommissionQueryKey(id),
      })
      toast.success('Comissão marcada como paga')
    },
    onError: (error) => {
      toast.error(
        extractErrorMessage(error, 'Erro ao marcar comissão como paga')
      )
    },
  })
}

export function useReverseCommission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reverseCommission(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: COMMISSIONS_LIST_KEY,
      })
      void queryClient.invalidateQueries({
        queryKey: getGetCommissionQueryKey(id),
      })
      toast.success('Comissão estornada com sucesso')
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Erro ao estornar comissão'))
    },
  })
}

function buildFilterParams(filters: CommissionFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.statusIn) params.set('statusIn', filters.statusIn)
  if (filters.salespersonId) params.set('salespersonId', filters.salespersonId)
  if (filters.policyId) params.set('policyId', filters.policyId)
  if (filters.search) params.set('search', filters.search)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  return params
}

/**
 * CSV export stays manual because it downloads a blob via fetch, not JSON.
 */
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
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Erro ao exportar comissões'))
    },
  })
}
