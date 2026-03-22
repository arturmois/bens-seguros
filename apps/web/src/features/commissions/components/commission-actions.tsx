'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { CommissionStatus } from '../types'
import { TERMINAL_COMMISSION_STATUSES } from '../lib/constants'
import {
  useApproveAdmin,
  useApproveCommercial,
  usePayCommission,
  useRejectCommission,
  useReverseCommission,
} from '../hooks/use-commissions'
import { RejectDialog, ReverseDialog } from './commission-dialogs'

interface CommissionActionsProps {
  readonly commissionId: string
  readonly currentStatus: CommissionStatus
}

export function CommissionActions({
  commissionId,
  currentStatus,
}: CommissionActionsProps) {
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const approveCommercial = useApproveCommercial()
  const approveAdmin = useApproveAdmin()
  const reject = useRejectCommission()
  const pay = usePayCommission()
  const reverse = useReverseCommission()

  if (TERMINAL_COMMISSION_STATUSES.includes(currentStatus)) {
    return null
  }

  function handleRejectConfirm() {
    if (rejectionReason.trim().length === 0) return

    reject.mutate(
      { id: commissionId, reason: rejectionReason.trim() },
      {
        onSuccess: () => {
          setRejectOpen(false)
          setRejectionReason('')
        },
      }
    )
  }

  function handleReverseConfirm() {
    reverse.mutate(commissionId, {
      onSuccess: () => setReverseOpen(false),
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Ações</h3>
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'PENDING_COMMERCIAL' && (
          <>
            <ActionButton
              label="Aprovar Comercial"
              variant="approve"
              isPending={approveCommercial.isPending}
              onClick={() => approveCommercial.mutate(commissionId)}
            />
            <ActionButton
              label="Rejeitar"
              variant="reject"
              isPending={reject.isPending}
              onClick={() => setRejectOpen(true)}
            />
          </>
        )}

        {currentStatus === 'PENDING_ADMIN' && (
          <>
            <ActionButton
              label="Aprovar Admin"
              variant="approve"
              isPending={approveAdmin.isPending}
              onClick={() => approveAdmin.mutate(commissionId)}
            />
            <ActionButton
              label="Rejeitar"
              variant="reject"
              isPending={reject.isPending}
              onClick={() => setRejectOpen(true)}
            />
          </>
        )}

        {currentStatus === 'APPROVED' && (
          <ActionButton
            label="Marcar como Paga"
            variant="default"
            isPending={pay.isPending}
            onClick={() => pay.mutate(commissionId)}
          />
        )}

        {currentStatus === 'PAID' && (
          <ActionButton
            label="Estornar"
            variant="default"
            isPending={reverse.isPending}
            onClick={() => setReverseOpen(true)}
          />
        )}
      </div>

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        reason={rejectionReason}
        onReasonChange={setRejectionReason}
        onConfirm={handleRejectConfirm}
        isPending={reject.isPending}
      />

      <ReverseDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        onConfirm={handleReverseConfirm}
        isPending={reverse.isPending}
      />
    </div>
  )
}

function ActionButton({
  label,
  variant,
  isPending,
  onClick,
}: {
  readonly label: string
  readonly variant: 'approve' | 'reject' | 'default'
  readonly isPending: boolean
  readonly onClick: () => void
}) {
  const styles = {
    approve:
      'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600',
    reject:
      'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
    default: '',
  }

  return (
    <Button
      size="sm"
      variant={variant === 'default' ? 'outline' : 'default'}
      className={styles[variant]}
      disabled={isPending}
      onClick={onClick}
    >
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  )
}
