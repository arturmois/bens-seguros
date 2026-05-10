'use client'

import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { chatApi, ChatApiError } from '@/features/chat/lib/chat-api'

import type { MetaAsset } from '../types'

interface AuthUrlResponse {
  url: string
  state: string
}

interface CallbackResponse {
  sessionId: string
  assets: MetaAsset[]
  channelType: string
}

interface AssetsResponse {
  assets: MetaAsset[]
}

interface ConnectResponse {
  channel: {
    channelId: string
    name: string
    type: string
    status: string
  }
  webhookSubscription: string
}

type OAuthStep =
  | 'idle'
  | 'authenticating'
  | 'selecting'
  | 'connecting'
  | 'done'
  | 'error'

export function useMetaOAuth() {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<OAuthStep>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [assets, setAssets] = useState<MetaAsset[]>([])
  const popupRef = useRef<Window | null>(null)
  const startOAuth = useCallback(
    async (channelType: 'MESSENGER' | 'INSTAGRAM') => {
      setStep('authenticating')
      try {
        const { data } = await chatApi.get<AuthUrlResponse>(
          `/meta/auth/url?channelType=${channelType}`
        )
        const popup = window.open(
          data.url,
          'meta-oauth',
          'width=600,height=700,scrollbars=yes'
        )
        popupRef.current = popup
      } catch {
        setStep('error')
        toast.error('Erro ao iniciar conexão com Facebook')
      }
    },
    []
  )
  const handleCallback = useCallback(async (code: string, state: string) => {
    try {
      const { data } = await chatApi.post<CallbackResponse>(
        '/meta/auth/callback',
        {
          code,
          state,
        }
      )
      setSessionId(data.sessionId)
      setAssets(data.assets)
      setStep('selecting')
    } catch (err) {
      setStep('error')
      const msg =
        err instanceof ChatApiError
          ? err.message
          : 'Erro ao processar autorização'
      toast.error(msg)
    }
  }, [])
  const connectChannel = useCallback(
    async (input: {
      pageId: string
      channelType: 'MESSENGER' | 'INSTAGRAM'
      name: string
      instagramAccountId?: string
    }) => {
      if (!sessionId) return
      setStep('connecting')
      try {
        const { data } = await chatApi.post<ConnectResponse>('/meta/connect', {
          sessionId,
          pageId: input.pageId,
          channelType: input.channelType,
          channelName: input.name,
          ...(input.instagramAccountId
            ? { instagramAccountId: input.instagramAccountId }
            : {}),
        })
        setStep('done')
        toast.success(`Canal "${input.name}" conectado com sucesso`)
        void queryClient.invalidateQueries({ queryKey: ['channels'] })
        return data.channel
      } catch (err) {
        setStep('error')
        const msg =
          err instanceof ChatApiError ? err.message : 'Erro ao conectar canal'
        toast.error(msg)
      }
    },
    [sessionId]
  )
  const handleRedirectSession = useCallback(
    async (redirectSessionId: string) => {
      setSessionId(redirectSessionId)
      setStep('selecting')
      try {
        const assetsResponse = await chatApi.get<AssetsResponse>(
          `/meta/assets?sessionId=${redirectSessionId}`
        )
        setAssets(assetsResponse.data.assets)
      } catch (err) {
        setStep('error')
        const msg =
          err instanceof ChatApiError
            ? err.message
            : 'Erro ao carregar páginas disponíveis'
        toast.error(msg)
      }
    },
    []
  )
  const reset = useCallback(() => {
    setStep('idle')
    setSessionId(null)
    setAssets([])
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }
  }, [])
  return {
    step,
    assets,
    startOAuth,
    handleCallback,
    handleRedirectSession,
    connectChannel,
    reset,
  }
}
