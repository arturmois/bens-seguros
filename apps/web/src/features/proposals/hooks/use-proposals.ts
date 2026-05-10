'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  advanceProposal,
  createProposal,
  getGetProposalChecklistQueryKey,
  getGetProposalQueryKey,
  getListProposalsQueryKey,
  markProposalLost,
  updateProposalDetails,
  useGetProposal,
  useListProposals,
} from '@/api/endpoints/proposals/proposals'
import type {
  CreateProposalBody,
  ListProposalsParams,
  UpdateProposalDetailsBody,
} from '@/api/model'
import { ApiError } from '@/lib/api-client'

import type { BoardType, ProposalStage } from '../lib/constants'

type ProposalFilters = Omit<ListProposalsParams, 'stage' | 'boardType'> & {
  stage?: ProposalStage
  boardType?: BoardType
}

export function useProposals(filters: ProposalFilters) {
  return useListProposals(filters, {
    query: {
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}

export function useProposal(id: string) {
  return useGetProposal(id, {
    query: {
      enabled: Boolean(id),
      select: (response) =>
        'data' in response.data
          ? { data: response.data.data }
          : { data: undefined },
    },
  })
}

export function useCreateProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProposalBody) => createProposal(data),
    onSuccess: () => {
      toast.success('Proposta criada com sucesso')
      void queryClient.invalidateQueries({
        queryKey: getListProposalsQueryKey(),
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
        queryKey: getListProposalsQueryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetProposalQueryKey(id),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetProposalChecklistQueryKey(id),
      })
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === 'CONTACT_NOT_PROMOTED') {
        return
      }
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
        queryKey: getListProposalsQueryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetProposalQueryKey(id),
      })
    },
    onError: () => {
      toast.error('Erro ao marcar proposta como perda')
    },
  })
}

export function useUpdateProposalDetails() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & Omit<UpdateProposalDetailsBody, 'details'> & {
        details: UpdateProposalDetailsBody['details']
      }) => updateProposalDetails(id, body),
    onSuccess: (_data, variables) => {
      toast.success('Dados do objeto segurado salvos')
      void queryClient.invalidateQueries({
        queryKey: getListProposalsQueryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetProposalQueryKey(variables.id),
      })
    },
    onError: () => {
      toast.error('Erro ao salvar dados')
    },
  })
}
