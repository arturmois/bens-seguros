'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import {
  CLAIM_STATUS_BUTTON_STYLES,
  CLAIM_STATUS_LABELS,
  VALID_CLAIM_TRANSITIONS,
} from '../lib/constants'
import { useUpdateClaimStatus } from '../hooks/use-claims'
import type { ClaimStatus } from '../lib/types'

interface ClaimStatusActionsProps {
  readonly claimId: string
  readonly currentStatus: ClaimStatus
}

export function ClaimStatusActions({
  claimId,
  currentStatus,
}: ClaimStatusActionsProps) {
  const [confirmingStatus, setConfirmingStatus] = useState<ClaimStatus | null>(
    null
  )
  const updateStatus = useUpdateClaimStatus()

  const allowedTransitions = VALID_CLAIM_TRANSITIONS[currentStatus]

  if (allowedTransitions.length === 0) {
    return null
  }

  function handleConfirm() {
    if (!confirmingStatus) return

    updateStatus.mutate(
      { id: claimId, status: confirmingStatus },
      { onSuccess: () => setConfirmingStatus(null) }
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Alterar Status</h3>
      <div className="flex flex-wrap gap-2">
        {allowedTransitions.map((targetStatus) => (
          <StatusTransitionButton
            key={targetStatus}
            targetStatus={targetStatus}
            onClick={() => setConfirmingStatus(targetStatus)}
          />
        ))}
      </div>

      <AlertDialog
        open={confirmingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingStatus(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja alterar o status do sinistro para{' '}
              <strong>
                {confirmingStatus ? CLAIM_STATUS_LABELS[confirmingStatus] : ''}
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              render={
                <Button variant="outline" disabled={updateStatus.isPending}>
                  Cancelar
                </Button>
              }
            />
            <Button onClick={handleConfirm} disabled={updateStatus.isPending}>
              {updateStatus.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatusTransitionButton({
  targetStatus,
  onClick,
}: {
  readonly targetStatus: ClaimStatus
  readonly onClick: () => void
}) {
  const { variant, className } = CLAIM_STATUS_BUTTON_STYLES[targetStatus]

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={onClick}
      className={className}
    >
      {CLAIM_STATUS_LABELS[targetStatus]}
    </Button>
  )
}
