'use client'

import { SOCKET_EVENTS } from '@repo/shared'
import { QrCode, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { useSocket } from '@/features/chat/hooks/use-socket'
import { chatApi } from '@/features/chat/lib/chat-api'
import { isRecord } from '@/features/chat/lib/type-guards'

import type {
  ChannelData,
  ChannelStatusEvent,
  PairingCodeResultEvent,
} from '../types'
import { PairingCodeTab } from './channel-pairing-tab'
import { ConnectedState, QrCodeDisplay, WaitingState } from './channel-qr-tab'

interface ChannelQrDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly channel: ChannelData | null
}

const AUTO_CLOSE_DELAY_MS = 3_000

function isChannelStatusEvent(data: unknown): data is ChannelStatusEvent {
  if (!isRecord(data)) return false
  return (
    typeof data['channelId'] === 'string' &&
    typeof data['status'] === 'string' &&
    ['CONNECTED', 'DISCONNECTED', 'QR_PENDING'].includes(data['status'])
  )
}

function isPairingCodeResultEvent(
  data: unknown
): data is PairingCodeResultEvent {
  if (!isRecord(data)) return false
  return (
    typeof data['channelId'] === 'string' &&
    typeof data['success'] === 'boolean'
  )
}

interface ChannelStateAckData {
  readonly state: string
  readonly qr: string | null
}

interface ChannelStateAck {
  readonly ok: boolean
  readonly data?: ChannelStateAckData
}

function isChannelStateAck(data: unknown): data is ChannelStateAck {
  if (!isRecord(data)) return false
  if (typeof data['ok'] !== 'boolean') return false
  if (data['ok'] && isRecord(data['data'])) {
    const inner = data['data']
    return typeof inner['state'] === 'string'
  }
  return true
}

export function ChannelQrDialog({
  open,
  onOpenChange,
  channel,
}: ChannelQrDialogProps) {
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
          onOpenChange(false)
        }, AUTO_CLOSE_DELAY_MS)
      }
    },
    [channel, onOpenChange, queryClient]
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
  const handleRequestPairingCode = useCallback(() => {
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Canal</DialogTitle>
          <DialogDescription>
            Escolha como conectar seu WhatsApp a este canal.
          </DialogDescription>
        </DialogHeader>
        {isConnected ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <ConnectedState />
          </div>
        ) : (
          <Tabs defaultValue="qr">
            <TabsList className="w-full">
              <TabsTab value="qr">
                <QrCode className="size-4" />
                QR Code
              </TabsTab>
              <TabsTab value="pairing">
                <Smartphone className="size-4" />
                Código de Pareamento
              </TabsTab>
            </TabsList>
            <TabsPanel value="qr">
              <div className="flex flex-col items-center gap-4 py-6">
                {qrData && <QrCodeDisplay qrData={qrData} />}
                {!qrData && <WaitingState />}
              </div>
            </TabsPanel>
            <TabsPanel value="pairing">
              <div className="flex flex-col items-center gap-4 py-6">
                <PairingCodeTab
                  phoneInput={phoneInput}
                  onPhoneChange={setPhoneInput}
                  onRequest={handleRequestPairingCode}
                  loading={pairingLoading}
                  code={pairingCode}
                  error={pairingError}
                />
              </div>
            </TabsPanel>
          </Tabs>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
