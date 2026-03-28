'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@repo/core'
import { api } from '@/lib/api-client'

interface TermsStatusData {
  needsReAccept: boolean
  currentTermsVersion: string
  currentPrivacyVersion: string
  userTermsVersion: string | null
  userPrivacyVersion: string | null
}

interface AcceptTermsResult {
  termsVersion: string
  privacyVersion: string
  acceptedAt: string
}

async function fetchTermsStatus(): Promise<TermsStatusData> {
  const response = await api.get<TermsStatusData>('/api/terms/status')
  return response.data
}

async function acceptTerms(): Promise<AcceptTermsResult> {
  const response = await api.post<AcceptTermsResult>('/api/terms/accept', {
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION,
  })
  return response.data
}

export function useTermsAcceptance() {
  const queryClient = useQueryClient()

  const status = useQuery({
    queryKey: ['terms', 'status'],
    queryFn: fetchTermsStatus,
    staleTime: 60_000,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: acceptTerms,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', 'status'] })
    },
  })

  return {
    needsReAccept: status.data?.needsReAccept ?? false,
    isLoading: status.isLoading,
    accept,
  }
}
