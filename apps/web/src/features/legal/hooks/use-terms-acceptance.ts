'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from '@repo/core/legal'

import {
  useGetTermsStatus,
  acceptTerms,
  getGetTermsStatusQueryKey,
} from '@/api/endpoints/terms/terms'

export function useTermsAcceptance() {
  const queryClient = useQueryClient()

  const status = useGetTermsStatus({
    query: {
      staleTime: 60_000,
      retry: false,
      select: (response) => response.data.data,
    },
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
