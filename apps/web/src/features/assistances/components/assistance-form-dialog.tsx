'use client'

import { useState } from 'react'

import { FormDialogShell } from '@/components/shared/form-dialog-shell'

import { AssistanceForm } from './assistance-form'

interface AssistanceFormDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCreated?: (assistanceId: string) => void
}

const FORM_ID = 'create-assistance-form'

export function AssistanceFormDialog({
  open,
  onOpenChange,
  onCreated,
}: AssistanceFormDialogProps) {
  const [isPending, setIsPending] = useState(false)
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Nova assistência"
      description="Preencha os dados para registrar uma nova assistência."
      formId={FORM_ID}
      isPending={isPending}
      submitLabel="Registrar assistência"
      keyboardHintAction="registrar"
      size="lg"
    >
      <AssistanceForm
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
