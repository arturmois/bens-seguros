'use client'

import { useState } from 'react'

import { FormDialogShell } from '@/components/shared/form-dialog-shell'

import { ClientForm } from './client-form'

interface CreateClientDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCreated: (clientId: string) => void
}

const FORM_ID = 'create-client-form'

export function CreateClientDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateClientDialogProps) {
  const [isPending, setIsPending] = useState(false)
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Novo cliente"
      description="Cadastre o essencial — você pode completar depois."
      formId={FORM_ID}
      isPending={isPending}
      submitLabel="Criar cliente"
      size="lg"
      keyboardHintAction="criar"
    >
      <ClientForm
        hideFooter
        formId={FORM_ID}
        onSuccess={onCreated}
        onPendingChange={setIsPending}
      />
    </FormDialogShell>
  )
}
