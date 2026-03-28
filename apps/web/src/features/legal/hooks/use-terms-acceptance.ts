'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@repo/core'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface TermsStatusData {
  needsReAccept: boolean
  currentTermsVersion: string
  currentPrivacyVersion: string
  userTermsVersion: string | null
  userPrivacyVersion: string | null
}

async function fetchTermsStatus(): Promise<TermsStatusData> {
  const response = await fetch(`${API_URL}/api/terms/status`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch terms status')
  }

  const json = (await response.json()) as {
    success: boolean
    data: TermsStatusData
  }

  return json.data
}

async function acceptTerms(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/api/terms/accept`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to accept terms')
  }

  const json = (await response.json()) as { success: boolean }
  return json
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
