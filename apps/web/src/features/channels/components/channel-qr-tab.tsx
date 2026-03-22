import { CheckCircle2, Loader2, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface QrCodeDisplayProps {
  readonly qrData: string
}

export function QrCodeDisplay({ qrData }: QrCodeDisplayProps) {
  return (
    <>
      <div className="bg-background rounded-lg border p-4">
        <QRCodeSVG value={qrData} size={256} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="text-warning size-4 animate-spin" />
        <span className="text-muted-foreground">Aguardando scan...</span>
      </div>
    </>
  )
}

export function WaitingState() {
  return (
    <>
      <div className="bg-muted flex size-64 items-center justify-center rounded-lg border">
        <QrCode className="text-muted-foreground size-16" />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
        <span className="text-muted-foreground">Gerando QR Code...</span>
      </div>
    </>
  )
}

export function ConnectedState() {
  return (
    <>
      <div className="bg-success/10 flex size-64 items-center justify-center rounded-lg border">
        <CheckCircle2 className="text-success size-16" />
      </div>
      <span className="text-success text-sm font-medium">Conectado!</span>
    </>
  )
}
