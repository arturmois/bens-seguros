'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api-client'
import {
  getListClaimsQueryKey,
  getGetClaimQueryKey,
  getListClaimOccurrencesQueryKey,
  getListClaimsUrl,
  getGetClaimUrl,
  getListClaimOccurrencesUrl,
  createClaim,
  updateClaimStatus,
  deleteClaim,
  createClaimOccurrence,
} from '@/api/endpoints/claims/claims'

import type {
  ClaimData,
  ClaimFilters,
  ClaimListMeta,
  ClaimStatus,
  OccurrenceData,
} from '../types'
import type { CreateClaimOccurrenceBodyMetadata } from '@/api/model'

import type { ClaimFormValues } from '../lib/schemas'

export const CLAIMS_QUERY_KEY = getListClaimsQueryKey

export function useClaims(filters: ClaimFilters) {
  return useQuery({
    queryKey: getListClaimsQueryKey(filters),
    queryFn: async () => {
      const response = await api.get<ClaimData[]>(getListClaimsUrl(filters))
      return {
        data: response.data,
        meta: response.meta as ClaimListMeta,
      }
    },
    staleTime: 60_000,
  })
}

export function useClaim(id: string) {
  return useQuery({
    queryKey: getGetClaimQueryKey(id),
    queryFn: async () => {
      const response = await api.get<ClaimData>(getGetClaimUrl(id))
      return response.data
    },
    staleTime: 60_000,
    enabled: id.length > 0,
  })
}

export function useCreateClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ClaimFormValues) => createClaim(values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListClaimsQueryKey(),
      })
      toast.success('Sinistro registrado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao registrar sinistro')
    },
  })
}

export function useUpdateClaimStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClaimStatus }) =>
      updateClaimStatus(id, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getListClaimsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getGetClaimQueryKey(variables.id),
      })
      toast.success('Status do sinistro atualizado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao atualizar status do sinistro')
    },
  })
}

export function useDeleteClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteClaim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListClaimsQueryKey(),
      })
      toast.success('Sinistro excluído com sucesso')
    },
    onError: () => {
      toast.error('Erro ao excluir sinistro')
    },
  })
}

export function useClaimOccurrences(claimId: string) {
  return useQuery({
    queryKey: getListClaimOccurrencesQueryKey(claimId),
    queryFn: async () => {
      const response = await api.get<OccurrenceData[]>(
        getListClaimOccurrencesUrl(claimId)
      )
      return response.data
    },
    staleTime: 60_000,
    enabled: claimId.length > 0,
  })
}

export function useCreateOccurrence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      claimId,
      type,
      description,
      metadata,
    }: {
      claimId: string
      type: string
      description: string
      metadata?: CreateClaimOccurrenceBodyMetadata
    }) => createClaimOccurrence(claimId, { type, description, metadata }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getListClaimOccurrencesQueryKey(variables.claimId),
      })
      toast.success('Ocorrência registrada com sucesso')
    },
    onError: () => {
      toast.error('Erro ao registrar ocorrência')
    },
  })
}
