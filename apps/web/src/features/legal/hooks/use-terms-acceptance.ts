'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from '@repo/core/legal'

import { api } from '@/lib/api-client'
import {
  getGetTermsStatusQueryKey,
  acceptTerms,
} from '@/api/endpoints/terms/terms'

interface TermsStatusData {
  needsReAccept: boolean
  currentTermsVersion: string
  currentPrivacyVersion: string
  userTermsVersion: string | null
  userPrivacyVersion: string | null
}

export function useTermsAcceptance() {
  const queryClient = useQueryClient()

  const status = useQuery({
    queryKey: getGetTermsStatusQueryKey(),
    queryFn: async () => {
      const response = await api.get<TermsStatusData>('/api/terms/status')
      return response.data
    },
    staleTime: 60_000,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: async () => {
      return acceptTerms({
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getGetTermsStatusQueryKey(),
      })
    },
  })

  return {
    needsReAccept: status.data?.needsReAccept ?? false,
    isLoading: status.isLoading,
    accept,
  }
}
