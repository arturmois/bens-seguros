'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  useListClaims,
  useGetClaim,
  useListClaimOccurrences,
  createClaim,
  updateClaimStatus,
  deleteClaim,
  createClaimOccurrence,
  getListClaimsQueryKey,
  getGetClaimQueryKey,
  getListClaimOccurrencesQueryKey,
} from '@/api/endpoints/claims/claims'

import type { z } from 'zod'

import { CreateClaimBody } from '@/api/endpoints/claims/claims.zod'

import type { ClaimFilters, ClaimStatus } from '../lib/constants'
import type { CreateClaimOccurrenceBodyMetadata } from '@/api/model'

type ClaimFormValues = z.infer<typeof CreateClaimBody>

export const CLAIMS_QUERY_KEY = getListClaimsQueryKey

export function useClaims(filters: ClaimFilters) {
  return useListClaims(filters, {
    query: {
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}

export function useClaim(id: string) {
  return useGetClaim(id, {
    query: {
      enabled: id.length > 0,
      select: (response) => response.data.data,
    },
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
  return useListClaimOccurrences(claimId, {
    query: {
      enabled: claimId.length > 0,
      select: (response) => response.data.data,
    },
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
