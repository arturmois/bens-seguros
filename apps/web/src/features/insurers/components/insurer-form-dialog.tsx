'use client'

import { useState } from 'react'

import type { ListInsurers200DataItem } from '@/api/model'
import { FormDialogShell } from '@/components/shared/form-dialog-shell'

import { InsurerForm } from './insurer-form'

interface InsurerFormDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSuccess?: (insurer: ListInsurers200DataItem) => void
}

const FORM_ID = 'create-insurer-form'

export function InsurerFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: InsurerFormDialogProps) {
  const [isPending, setIsPending] = useState(false)
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Nova seguradora"
      description="Cadastre uma seguradora para uso em propostas, apólices e sinistros."
      formId={FORM_ID}
      isPending={isPending}
      submitLabel="Criar seguradora"
      keyboardHintAction="criar"
      size="md"
    >
      <InsurerForm
        hideFooter
        formId={FORM_ID}
        onPendingChange={setIsPending}
        onSuccess={(insurer) => {
          onSuccess?.(insurer)
          onOpenChange(false)
        }}
      />
    </FormDialogShell>
  )
}
