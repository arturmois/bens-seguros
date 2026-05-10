'use client'

import { Loader2, Mail } from 'lucide-react'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/formatters'

interface SendQuoteDialogProps {
  proposalId: string
  clientName: string
  premiumValueInCents: number
  coverageStartDate: string | null
  sentToClientAt: string | null
  disabled: boolean
  onSend: () => void
  isPending: boolean
}

export function SendQuoteDialog({
  proposalId: _proposalId,
  clientName,
  premiumValueInCents,
  coverageStartDate,
  sentToClientAt,
  disabled,
  onSend,
  isPending,
}: SendQuoteDialogProps) {
  const [open, setOpen] = useState(false)
  const isResend = Boolean(sentToClientAt)
  function handleSend() {
    onSend()
    setOpen(false)
  }
  return (
    <>
      <Button
        variant="outline"
        disabled={disabled || isPending}
        onClick={() => setOpen(true)}
      >
        {isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Mail className="mr-2 size-4" />
        )}
        {isResend ? 'Reenviar Cotação' : 'Enviar Cotação'}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isResend ? 'Reenviar cotação?' : 'Enviar cotação por e-mail?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              A cotação será enviada em PDF para <strong>{clientName}</strong>.
              Prêmio: {formatCurrency(premiumValueInCents)}
              {coverageStartDate
                ? `. Vigência: ${formatDate(coverageStartDate)}`
                : ''}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              render={<Button variant="outline">Cancelar</Button>}
            />
            <Button onClick={handleSend}>Enviar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
