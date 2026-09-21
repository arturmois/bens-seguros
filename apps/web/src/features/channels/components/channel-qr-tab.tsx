import dynamic from 'next/dynamic'
import { CheckCircle2, Loader2, QrCode } from 'lucide-react'

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => ({ default: mod.QRCodeSVG })),
  {
    ssr: false,
    loading: () => (
      <div className="size-64 animate-pulse rounded-lg bg-muted" />
    ),
  }
)

interface QrCodeDisplayProps {
  readonly qrData: string
}

export function QrCodeDisplay({ qrData }: QrCodeDisplayProps) {
  return (
    <>
      <div className="rounded-lg border bg-background p-4">
        <QRCodeSVG value={qrData} size={256} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin text-warning" />
        <span className="text-muted-foreground">Aguardando scan...</span>
      </div>
    </>
  )
}

export function WaitingState() {
  return (
    <>
      <div className="flex size-64 items-center justify-center rounded-lg border bg-muted">
        <QrCode className="size-16 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Gerando QR Code...</span>
      </div>
    </>
  )
}

export function ConnectedState() {
  return (
    <>
      <div className="flex size-64 items-center justify-center rounded-lg border bg-success/10">
        <CheckCircle2 className="size-16 text-success" />
      </div>
      <span className="font-medium text-sm text-success">Conectado!</span>
    </>
  )
}
