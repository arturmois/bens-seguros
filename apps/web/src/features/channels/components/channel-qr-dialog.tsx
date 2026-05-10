'use client'

import { QrCode, Smartphone } from 'lucide-react'
import { useCallback } from 'react'

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

import { useChannelQrConnection } from '../hooks/use-channel-qr-connection'
import type { ChannelData } from '../types'
import { PairingCodeTab } from './channel-pairing-tab'
import { ConnectedState, QrCodeDisplay, WaitingState } from './channel-qr-tab'

interface ChannelQrDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly channel: ChannelData | null
}

export function ChannelQrDialog({
  open,
  onOpenChange,
  channel,
}: ChannelQrDialogProps) {
  const handleAutoClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])
  const {
    qrData,
    isConnected,
    phoneInput,
    setPhoneInput,
    pairingCode,
    pairingLoading,
    pairingError,
    requestPairingCode,
  } = useChannelQrConnection({
    channel,
    open,
    onAutoClose: handleAutoClose,
  })
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
                  onRequest={requestPairingCode}
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
