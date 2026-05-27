'use client'

import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/formatters'

import { useCancelBillingSubscription } from '../hooks/use-cancel-billing-subscription'

interface CancelSubscriptionDialogProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly currentPeriodEnd: string | null
}

export function CancelSubscriptionDialog({
  open,
  onClose,
  currentPeriodEnd,
}: CancelSubscriptionDialogProps) {
  const cancelMutation = useCancelBillingSubscription()

  function handleConfirm() {
    cancelMutation.mutate(undefined, {
      onSuccess: () => onClose(),
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !cancelMutation.isPending) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <AlertTriangle className="text-destructive size-6" />
          <DialogTitle>Cancelar assinatura?</DialogTitle>
          <DialogDescription>
            Você perderá acesso a recursos do plano após o fim do período pago.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 p-5 text-sm">
          {currentPeriodEnd !== null && (
            <p className="text-muted-foreground">
              Sua assinatura permanecerá ativa até{' '}
              <span className="text-foreground font-medium">
                {formatDate(currentPeriodEnd)}
              </span>
              . Após essa data, o acesso à organização será suspenso.
            </p>
          )}
          <p className="text-muted-foreground">
            Você pode reativar a qualquer momento entrando em contato com o
            suporte.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={cancelMutation.isPending}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending
              ? 'Cancelando...'
              : 'Confirmar cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
