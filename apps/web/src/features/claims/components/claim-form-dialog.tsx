'use client'

import { useState } from 'react'

import { FormDialogShell } from '@/components/shared/form-dialog-shell'

import { ClaimForm } from './claim-form'

interface ClaimFormDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCreated?: (claimId: string) => void
}

const FORM_ID = 'create-claim-form'

export function ClaimFormDialog({
  open,
  onOpenChange,
  onCreated,
}: ClaimFormDialogProps) {
  const [isPending, setIsPending] = useState(false)
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Novo sinistro"
      description="Preencha os dados para registrar um novo sinistro."
      formId={FORM_ID}
      isPending={isPending}
      submitLabel="Registrar sinistro"
      keyboardHintAction="registrar"
      size="lg"
    >
      <ClaimForm
        hideFooter
        formId={FORM_ID}
        onPendingChange={setIsPending}
        onSuccess={(id) => {
          onCreated?.(id)
          onOpenChange(false)
        }}
      />
    </FormDialogShell>
  )
}
