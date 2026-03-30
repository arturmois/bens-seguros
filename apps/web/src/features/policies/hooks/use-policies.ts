'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getGetPolicyQueryOptions,
  getListPoliciesUrl,
  getIssuePolicyUrl,
  cancelPolicy,
} from '@/api/endpoints/policies/policies'
import { api } from '@/lib/api-client'

import type { PolicyData, PolicyStatus } from '../types'

interface PoliciesFilters {
  status?: PolicyStatus
  clientId?: string
  proposalId?: string
  branch?: string
  search?: string
  cursor?: string
  limit?: number
}

interface PoliciesMeta {
  nextCursor: string | null
  hasMore: boolean
}

interface PoliciesResult {
  data: PolicyData[]
  meta: PoliciesMeta
}

interface PolicyResult {
  data: PolicyData
}

export function usePolicies(filters: PoliciesFilters = {}) {
  const params = new URLSearchParams()

  if (filters.status) params.set('status', filters.status)
  if (filters.clientId) params.set('clientId', filters.clientId)
  if (filters.proposalId) params.set('proposalId', filters.proposalId)
  if (filters.branch) params.set('branch', filters.branch)
  if (filters.search) params.set('search', filters.search)
  if (filters.cursor) params.set('cursor', filters.cursor)
  if (filters.limit) params.set('limit', String(filters.limit))

  const queryString = params.toString()
  const url = queryString
    ? `/api/v1/policies?${queryString}`
    : '/api/v1/policies'

  return useQuery<PoliciesResult>({
    queryKey: ['/api/v1/policies', filters],
    queryFn: async () => {
      const response = await api.get<PolicyData[]>(url)
      return {
        data: response.data,
        meta: {
          nextCursor: response.meta?.nextCursor ?? null,
          hasMore:
            response.meta?.nextCursor !== null &&
            response.meta?.nextCursor !== undefined,
        },
      }
    },
    staleTime: 60_000,
  })
}

export function usePolicy(id: string) {
  const orvalOptions = getGetPolicyQueryOptions(id)

  return useQuery<PolicyResult>({
    queryKey: orvalOptions.queryKey,
    queryFn: async () => {
      const response = await api.get<PolicyData>(`/api/v1/policies/${id}`)
      return { data: response.data }
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useIssuePolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: {
      proposalId: string
      policyNumber: string
      startDate: string
      endDate: string
    }) => {
      const response = await api.post<PolicyData>(getIssuePolicyUrl(), values)
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/policies'] })
      toast.success('Apólice emitida com sucesso!')
    },
    onError: () => {
      toast.error(
        'Erro ao emitir apólice. Verifique os dados e tente novamente.'
      )
    },
  })
}

export function usePolicyByProposal(proposalId: string) {
  return useQuery<PolicyData | null>({
    queryKey: ['/api/v1/policies', { proposalId, limit: 1 }],
    queryFn: async () => {
      const response = await api.get<PolicyData[]>(
        getListPoliciesUrl({ proposalId, limit: 1 })
      )
      const firstPolicy = response.data[0]
      return firstPolicy ?? null
    },
    enabled: Boolean(proposalId),
    staleTime: 60_000,
  })
}

export function useCancelPolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelPolicy(id, { reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/policies'] })
      toast.success('Apólice cancelada com sucesso.')
    },
    onError: () => {
      toast.error('Erro ao cancelar apólice. Tente novamente.')
    },
  })
}
