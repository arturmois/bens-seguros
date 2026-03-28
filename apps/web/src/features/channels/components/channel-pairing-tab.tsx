import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PairingCodeTabProps {
  readonly phoneInput: string
  readonly onPhoneChange: (value: string) => void
  readonly onRequest: () => void
  readonly loading: boolean
  readonly code: string | null
  readonly error: string | null
}

export function PairingCodeTab({
  phoneInput,
  onPhoneChange,
  onRequest,
  loading,
  code,
  error,
}: PairingCodeTabProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Ideal para ambientes sem câmera. Digite o número do WhatsApp e insira o
        código de 8 dígitos no celular.
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="+5511999998888"
          value={phoneInput}
          onChange={(e) => onPhoneChange(e.target.value)}
          disabled={loading}
          aria-label="Número de telefone"
        />
        <Button
          onClick={onRequest}
          disabled={loading || phoneInput.trim().length < 10}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : 'Gerar'}
        </Button>
      </div>

      {code && <PairingCodeDisplay code={code} />}

      {error && (
        <p className="text-destructive text-center text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function PairingCodeDisplay({ code }: { readonly code: string }) {
  const formatted =
    code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">
        Abra o WhatsApp no celular e vá em:
      </p>
      <p className="text-muted-foreground text-xs">
        Configurações &gt; Aparelhos conectados &gt; Conectar com número de
        telefone
      </p>
      <p
        className="font-mono text-3xl font-bold tracking-widest"
        aria-label={`Código de pareamento: ${formatted}`}
      >
        {formatted}
      </p>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="text-warning size-4 animate-spin" />
        <span className="text-muted-foreground">Aguardando pareamento...</span>
      </div>
    </div>
  )
}
