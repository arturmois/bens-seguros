'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { ChannelIcon } from '@/features/chat/components/channel-icon'
import { chatApi } from '@/features/chat/lib/chat-api'

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void
      login: (
        callback: (response: {
          authResponse?: { code?: string }
          status: string
        }) => void,
        options: Record<string, unknown>
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

interface ConnectWhatsAppResult {
  channelId: string
  name: string
}

interface MetaEmbeddedSignupProps {
  readonly onSuccess: (data: { channelId: string; name: string }) => void
  readonly onCancel: () => void
  readonly channelName?: string
}

type SignupState = 'idle' | 'loading-sdk' | 'sdk-ready' | 'connecting' | 'error'

export function MetaEmbeddedSignup({
  onSuccess,
  onCancel,
  channelName = 'WhatsApp Business',
}: MetaEmbeddedSignupProps) {
  const [state, setState] = useState<SignupState>(() => {
    if (typeof window !== 'undefined' && window.FB) return 'sdk-ready'
    return 'loading-sdk'
  })
  const phoneNumberIdRef = useRef<string | null>(null)
  const wabaIdRef = useRef<string | null>(null)
  const appId = process.env.NEXT_PUBLIC_META_APP_ID
  const configId = process.env.NEXT_PUBLIC_META_WA_CONFIG_ID
  useEffect(() => {
    if (!appId || !configId) {
      setState('error')
      return
    }
    if (window.FB) {
      setState('sdk-ready')
      return
    }
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0',
      })
      setState('sdk-ready')
    }
    const script = document.createElement('script')
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [appId, configId])
  useEffect(() => {
    function onSessionInfo(event: MessageEvent) {
      if (
        typeof event.data !== 'object' ||
        event.data === null ||
        event.origin !== 'https://www.facebook.com'
      ) {
        return
      }
      const data = event.data as Record<string, unknown>
      if (
        typeof data['phone_number_id'] === 'string' &&
        typeof data['waba_id'] === 'string'
      ) {
        phoneNumberIdRef.current = data['phone_number_id']
        wabaIdRef.current = data['waba_id']
      }
    }
    window.addEventListener('message', onSessionInfo)
    return () => {
      window.removeEventListener('message', onSessionInfo)
    }
  }, [])
  function handleStartSignup() {
    if (!window.FB || !configId) return
    setState('connecting')
    window.FB.login(
      (response) => {
        if (response.status !== 'connected' || !response.authResponse?.code) {
          setState('sdk-ready')
          return
        }
        const code = response.authResponse.code
        const phoneNumberId = phoneNumberIdRef.current
        const wabaId = wabaIdRef.current
        if (!phoneNumberId || !wabaId) {
          toast.error('Informações do número não recebidas. Tente novamente.')
          setState('sdk-ready')
          return
        }
        void chatApi
          .post<ConnectWhatsAppResult>('/meta/whatsapp/connect', {
            code,
            phoneNumberId,
            wabaId,
            name: channelName,
          })
          .then((result) => {
            toast.success('WhatsApp Business conectado com sucesso!')
            onSuccess(result.data)
          })
          .catch(() => {
            toast.error('Erro ao conectar WhatsApp Business. Tente novamente.')
            setState('sdk-ready')
          })
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_embedded_signup',
          sessionInfoVersion: '3',
        },
      }
    )
  }
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-muted-foreground text-sm">
          Integração com WhatsApp Business não configurada neste ambiente.
        </p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Voltar
        </Button>
      </div>
    )
  }
  if (state === 'loading-sdk') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Spinner className="size-6 text-green-600" />
        <p className="text-muted-foreground text-sm">
          Carregando integração Meta...
        </p>
      </div>
    )
  }
  const isConnecting = state === 'connecting'
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <ChannelIcon channelType="WHATSAPP" size={40} />
        <h3 className="font-semibold text-base">
          WhatsApp Business (Cloud API)
        </h3>
        <p className="max-w-xs text-muted-foreground text-sm">
          Conecte seu número comercial verificado pela Meta. Você será
          redirecionado para o fluxo de cadastro do WhatsApp Business.
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={isConnecting}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button size="sm" disabled={isConnecting} onClick={handleStartSignup}>
          {isConnecting ? (
            <Spinner className="size-4" />
          ) : (
            <ChannelIcon channelType="WHATSAPP" size={16} />
          )}
          {isConnecting ? 'Conectando...' : 'Iniciar cadastro'}
        </Button>
      </div>
    </div>
  )
}
