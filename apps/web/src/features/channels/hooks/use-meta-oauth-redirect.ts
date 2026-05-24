'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

type MetaChannelType = 'MESSENGER' | 'INSTAGRAM'

interface UseMetaOAuthRedirectParams {
  readonly onSuccess: (session: string, channelType: MetaChannelType) => void
}

export function useMetaOAuthRedirect({
  onSuccess,
}: UseMetaOAuthRedirectParams): void {
  const searchParams = useSearchParams()
  const hasProcessedRef = useRef(false)
  useEffect(() => {
    if (hasProcessedRef.current) return
    const metaSession = searchParams.get('meta_session')
    const metaChannelType = searchParams.get(
      'meta_channel_type'
    ) as MetaChannelType | null
    const metaError = searchParams.get('meta_error')
    if (metaError) {
      hasProcessedRef.current = true
      toast.error(`Erro na autenticação Meta: ${metaError}`)
      window.history.replaceState({}, '', '/settings?section=channels')
      return
    }
    if (metaSession && metaChannelType) {
      hasProcessedRef.current = true
      onSuccess(metaSession, metaChannelType)
      window.history.replaceState({}, '', '/settings?section=channels')
    }
  }, [searchParams, onSuccess])
}
