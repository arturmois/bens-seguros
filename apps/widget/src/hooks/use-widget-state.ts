import { useCallback, useEffect, useRef, useState } from 'react'

import type { ChannelConfig, ConversationResponse } from '../lib/widget-api'
import { fetchChannelConfig, startConversation } from '../lib/widget-api'

interface WidgetStateLoading {
  readonly phase: 'loading'
  readonly config: null
  readonly conversation: null
}

interface WidgetStateError {
  readonly phase: 'error'
  readonly config: null
  readonly conversation: null
}

interface WidgetStateForm {
  readonly phase: 'form'
  readonly config: ChannelConfig
  readonly conversation: null
  readonly isSubmitting: boolean
  readonly startChat: (params: {
    name: string
    phone: string
    email?: string
  }) => Promise<void>
}

interface WidgetStateChat {
  readonly phase: 'chat'
  readonly config: ChannelConfig
  readonly conversation: ConversationResponse
}

export type WidgetState =
  | WidgetStateLoading
  | WidgetStateError
  | WidgetStateForm
  | WidgetStateChat

export function useWidgetState(channelId: string | null): WidgetState {
  const [config, setConfig] = useState<ChannelConfig | null>(null)
  const [conversation, setConversation] = useState<ConversationResponse | null>(
    null
  )
  const [phase, setPhase] = useState<'loading' | 'error' | 'form' | 'chat'>(
    'loading'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loadedRef = useRef(false)
  useEffect(() => {
    if (!channelId || loadedRef.current) return
    loadedRef.current = true
    async function loadConfig(): Promise<void> {
      const result = await fetchChannelConfig(channelId!)
      if (!result) {
        setPhase('error')
        return
      }
      setConfig(result)
      document.documentElement.style.setProperty(
        '--widget-primary',
        result.widgetColor
      )
      setPhase('form')
    }
    void loadConfig()
  }, [channelId])
  const startChat = useCallback(
    async (params: {
      name: string
      phone: string
      email?: string
    }): Promise<void> => {
      if (!channelId || !config) return
      setIsSubmitting(true)
      const cleanPhone = params.phone.replace(/\D/g, '')
      const formattedPhone = cleanPhone.startsWith('55')
        ? `+${cleanPhone}`
        : `+55${cleanPhone}`
      const result = await startConversation({
        channelId,
        name: params.name,
        phone: formattedPhone,
        email: params.email,
      })
      setIsSubmitting(false)
      if (!result) return
      setConversation(result)
      setPhase('chat')
    },
    [channelId, config]
  )
  if (phase === 'loading') {
    return { phase, config: null, conversation: null }
  }
  if (phase === 'error') {
    return { phase, config: null, conversation: null }
  }
  if (phase === 'chat' && config && conversation) {
    return { phase, config, conversation }
  }
  if (!config) {
    return { phase: 'loading', config: null, conversation: null }
  }
  return {
    phase: 'form',
    config,
    conversation: null,
    isSubmitting,
    startChat,
  }
}
