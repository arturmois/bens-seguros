'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QrCode, Cloud } from 'lucide-react'

interface WhatsAppMethodDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSelectQrCode: () => void
  readonly onSelectCloudApi: () => void
}

export function WhatsAppMethodDialog({
  open,
  onOpenChange,
  onSelectQrCode,
  onSelectCloudApi,
}: WhatsAppMethodDialogProps) {
  const hasCloudApiConfig = Boolean(
    process.env.NEXT_PUBLIC_META_WA_CONFIG_ID &&
      process.env.NEXT_PUBLIC_META_APP_ID
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escolha como deseja conectar o WhatsApp
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-6 pb-6">
          <button
            type="button"
            disabled={!hasCloudApiConfig}
            onClick={() => {
              onOpenChange(false)
              onSelectCloudApi()
            }}
            className="flex items-start gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="mt-0.5 shrink-0">
              <Cloud className="size-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">
                WhatsApp Business (Cloud API)
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {hasCloudApiConfig
                  ? 'Número comercial verificado pela Meta. Ideal para empresas.'
                  : 'Número comercial verificado pela Meta. Não configurado neste ambiente.'}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false)
              onSelectQrCode()
            }}
            className="flex items-start gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-accent"
          >
            <div className="mt-0.5 shrink-0">
              <QrCode className="size-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">
                WhatsApp Pessoal (QR Code)
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Conecte seu WhatsApp pessoal escaneando um QR code.
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
