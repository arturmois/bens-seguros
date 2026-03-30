'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getListProposalsQueryKey,
  getGetProposalQueryOptions,
  getGetProposalChecklistQueryKey,
  getListProposalsUrl,
  getCreateProposalUrl,
  advanceProposal,
  markProposalLost,
  updateProposalDetails,
} from '@/api/endpoints/proposals/proposals'
import { api, ApiError } from '@/lib/api-client'

import type {
  BoardType,
  InsuredObjectDetails,
  ProposalData,
  ProposalStage,
} from '../types'

interface ProposalFilters {
  stage?: ProposalStage
  boardType?: BoardType
  search?: string
  clientId?: string
  cursor?: string
  limit?: number
}

interface PaginatedResult {
  data: ProposalData[]
  meta: {
    nextCursor: string | null
    hasMore: boolean
  }
}

interface SingleResult {
  data: ProposalData
}

interface CreateProposalInput {
  clientId: string
  branch: string
  boardType: string
}

export function useProposals(filters: ProposalFilters) {
  return useQuery<PaginatedResult>({
    queryKey: getListProposalsQueryKey(filters),
    queryFn: async () => {
      const response = await api.get<ProposalData[]>(
        getListProposalsUrl(filters)
      )
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

export function useProposal(id: string) {
  const orvalOptions = getGetProposalQueryOptions(id)

  return useQuery<SingleResult>({
    queryKey: orvalOptions.queryKey,
    queryFn: async () => {
      const response = await api.get<ProposalData>(`/api/v1/proposals/${id}`)
      return { data: response.data }
    },
    staleTime: 60_000,
    enabled: Boolean(id),
  })
}

export function useCreateProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProposalInput) =>
      api.post<ProposalData>(getCreateProposalUrl(), data),
    onSuccess: () => {
      toast.success('Proposta criada com sucesso')
      void queryClient.invalidateQueries({
        queryKey: ['/api/v1/proposals'],
      })
    },
    onError: () => {
      toast.error('Erro ao criar proposta')
    },
  })
}

export function useAdvanceProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => advanceProposal(id),
    onSuccess: (_data, id) => {
      toast.success('Estágio avançado com sucesso')
      void queryClient.invalidateQueries({
        queryKey: ['/api/v1/proposals'],
      })
      void queryClient.invalidateQueries({
        queryKey: [`/api/v1/proposals/${id}`],
      })
      void queryClient.invalidateQueries({
        queryKey: getGetProposalChecklistQueryKey(id),
      })
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : 'Erro ao avançar estágio'
      toast.error(message)
    },
  })
}

interface MarkLostInput {
  id: string
  reason: string
}

export function useMarkProposalLost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: MarkLostInput) =>
      markProposalLost(id, { reason }),
    onSuccess: (_data, { id }) => {
      toast.success('Proposta marcada como perda')
      void queryClient.invalidateQueries({
        queryKey: ['/api/v1/proposals'],
      })
      void queryClient.invalidateQueries({
        queryKey: [`/api/v1/proposals/${id}`],
      })
    },
    onError: () => {
      toast.error('Erro ao marcar proposta como perda')
    },
  })
}

interface UpdateProposalDetailsInput {
  id: string
  details: InsuredObjectDetails
  premiumValueInCents: number
  commissionBasisPoints: number
}

export function useUpdateProposalDetails() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...rest }: UpdateProposalDetailsInput) =>
      updateProposalDetails(id, {
        details: rest.details,
        premiumValueInCents: rest.premiumValueInCents,
        commissionBasisPoints: rest.commissionBasisPoints,
      }),
    onSuccess: (_data, variables) => {
      toast.success('Dados do objeto segurado salvos')
      void queryClient.invalidateQueries({
        queryKey: ['/api/v1/proposals'],
      })
      void queryClient.invalidateQueries({
        queryKey: [`/api/v1/proposals/${variables.id}`],
      })
    },
    onError: () => {
      toast.error('Erro ao salvar dados')
    },
  })
}
