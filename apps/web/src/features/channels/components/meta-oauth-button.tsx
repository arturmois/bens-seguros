'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import { ChannelIcon } from '@/features/chat/components/channel-icon'
import { useMetaOAuth } from '../hooks/use-meta-oauth'

interface MetaOAuthCallbackMessage {
  readonly type: 'meta-oauth-callback'
  readonly code: string
  readonly state: string
}

function isMetaOAuthCallback(data: unknown): data is MetaOAuthCallbackMessage {
  if (typeof data !== 'object' || data === null) return false
  const msg = data as Record<string, unknown>
  return (
    msg['type'] === 'meta-oauth-callback' &&
    typeof msg['code'] === 'string' &&
    typeof msg['state'] === 'string'
  )
}

interface MetaOAuthButtonProps {
  readonly channelType: 'MESSENGER' | 'INSTAGRAM'
  readonly onSuccess: () => void
}

export function MetaOAuthButton({
  channelType,
  onSuccess,
}: MetaOAuthButtonProps) {
  const { step, assets, startOAuth, handleCallback, reset } = useMetaOAuth()
  const isLoading = step === 'authenticating'
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isMetaOAuthCallback(event.data)) return
      void handleCallback(event.data.code, event.data.state)
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [handleCallback])
  useEffect(() => {
    if (step === 'selecting' && assets.length > 0) {
      onSuccess()
    }
  }, [step, assets, onSuccess])
  function handleClick() {
    if (step === 'error') {
      reset()
    }
    void startOAuth(channelType)
  }
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isLoading}
      onClick={handleClick}
    >
      {isLoading ? (
        <Spinner className="size-4" />
      ) : (
        <ChannelIcon channelType={channelType} size={16} />
      )}
      Conectar
    </Button>
  )
}
