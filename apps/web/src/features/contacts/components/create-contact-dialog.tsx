'use client'

import { useState } from 'react'

import { FormDialogShell } from '@/components/shared/form-dialog-shell'

import { ContactForm } from './contact-form'

interface CreateContactDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCreated: (contactId: string) => void
}

const FORM_ID = 'create-contact-form'

export function CreateContactDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateContactDialogProps) {
  const [isPending, setIsPending] = useState(false)
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Novo contato"
      description="CPF/CNPJ é opcional — você pode promover a cliente depois."
      formId={FORM_ID}
      isPending={isPending}
      submitLabel="Criar contato"
      keyboardHintAction="criar"
      size="md"
    >
      <ContactForm
        mode="create"
        hideFooter
        formId={FORM_ID}
        onSuccess={onCreated}
        onPendingChange={setIsPending}
      />
    </FormDialogShell>
  )
}
