'use client'

import { SOCKET_EVENTS } from '@repo/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useSocket } from '@/features/chat/hooks/use-socket'
import { chatApi } from '@/features/chat/lib/chat-api'

import {
  isChannelStateAck,
  isChannelStatusEvent,
  isPairingCodeResultEvent,
} from '../lib/channel-event-guards'
import type { ChannelData } from '../types'

const AUTO_CLOSE_DELAY_MS = 3_000

interface UseChannelQrConnectionParams {
  readonly channel: ChannelData | null
  readonly open: boolean
  readonly onAutoClose: () => void
}

interface UseChannelQrConnectionResult {
  readonly qrData: string | null
  readonly isConnected: boolean
  readonly phoneInput: string
  readonly setPhoneInput: (value: string) => void
  readonly pairingCode: string | null
  readonly pairingLoading: boolean
  readonly pairingError: string | null
  readonly requestPairingCode: () => void
}

export function useChannelQrConnection({
  channel,
  open,
  onAutoClose,
}: UseChannelQrConnectionParams): UseChannelQrConnectionResult {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const [qrData, setQrData] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [pairingError, setPairingError] = useState<string | null>(null)
  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }, [])
  const handleChannelStatus = useCallback(
    (data: unknown) => {
      if (!isChannelStatusEvent(data)) return
      if (!channel || data.channelId !== channel.id) return
      if (data.status === 'QR_PENDING' && data.qr) {
        setQrData(data.qr)
        setIsConnected(false)
        return
      }
      if (data.status === 'CONNECTED') {
        setIsConnected(true)
        setQrData(null)
        setPairingCode(null)
        setPairingLoading(false)
        toast.success('Canal conectado com sucesso')
        void queryClient.invalidateQueries({ queryKey: ['channels'] })
        autoCloseTimerRef.current = globalThis.setTimeout(() => {
          onAutoClose()
        }, AUTO_CLOSE_DELAY_MS)
      }
    },
    [channel, onAutoClose, queryClient]
  )
  const handlePairingCodeResult = useCallback(
    (data: unknown) => {
      if (!isPairingCodeResultEvent(data)) return
      if (!channel || data.channelId !== channel.id) return
      setPairingLoading(false)
      if (data.success && data.code) {
        setPairingCode(data.code)
        setPairingError(null)
        return
      }
      setPairingError(data.error ?? 'Erro ao gerar código de pareamento')
    },
    [channel]
  )
  useEffect(() => {
    if (!open || !socket || !channel) return
    setQrData(null)
    setIsConnected(false)
    setPairingCode(null)
    setPairingLoading(false)
    setPairingError(null)
    clearAutoCloseTimer()
    socket.on(SOCKET_EVENTS.CHANNEL_STATUS, handleChannelStatus)
    socket.on(SOCKET_EVENTS.PAIRING_CODE_RESULT, handlePairingCodeResult)
    socket.emit(
      SOCKET_EVENTS.CHANNEL_STATUS_GET,
      { channelId: channel.id },
      (response: unknown) => {
        if (!isChannelStateAck(response)) return
        if (!response.ok || !response.data) return
        const { state, qr } = response.data
        if (state === 'qr_pending' && qr) {
          setQrData(qr)
          setIsConnected(false)
          return
        }
        if (state === 'connected') {
          setIsConnected(true)
          setQrData(null)
        }
      }
    )
    return () => {
      socket.off(SOCKET_EVENTS.CHANNEL_STATUS, handleChannelStatus)
      socket.off(SOCKET_EVENTS.PAIRING_CODE_RESULT, handlePairingCodeResult)
      clearAutoCloseTimer()
    }
  }, [
    open,
    socket,
    channel,
    handleChannelStatus,
    handlePairingCodeResult,
    clearAutoCloseTimer,
  ])
  useEffect(() => {
    if (!open || !channel) return
    chatApi.post(`/chat/channels/${channel.id}/connect`, {}).catch(() => {
      toast.error('Erro ao iniciar conexão do canal')
    })
  }, [open, channel])
  useEffect(() => {
    if (!open) {
      clearAutoCloseTimer()
    }
  }, [open, clearAutoCloseTimer])
  const requestPairingCode = useCallback(() => {
    if (!channel || !phoneInput.trim()) return
    setPairingLoading(true)
    setPairingError(null)
    setPairingCode(null)
    chatApi
      .post(`/chat/channels/${channel.id}/pair`, {
        phoneNumber: phoneInput.trim(),
      })
      .catch(() => {
        setPairingLoading(false)
        setPairingError('Erro ao solicitar código de pareamento')
      })
  }, [channel, phoneInput])
  return {
    qrData,
    isConnected,
    phoneInput,
    setPhoneInput,
    pairingCode,
    pairingLoading,
    pairingError,
    requestPairingCode,
  }
}
