'use client'

import { useState } from 'react'

import { FormDialogShell } from '@/components/shared/form-dialog-shell'

import type { AiAgentFormValues } from '../lib/schemas'
import type { AiAgentData } from '../types'
import { AiAgentForm } from './ai-agent-form'

interface AiAgentFormDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly defaultValues?: AiAgentFormValues
  readonly onCreated?: (agent: AiAgentData) => void
}

const FORM_ID = 'create-ai-agent-form'

export function AiAgentFormDialog({
  open,
  onOpenChange,
  defaultValues,
  onCreated,
}: AiAgentFormDialogProps) {
  const [isPending, setIsPending] = useState(false)
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Novo agente"
      description="Configure um novo agente de IA para atendimento."
      formId={FORM_ID}
      isPending={isPending}
      submitLabel="Criar agente"
      keyboardHintAction="criar"
      size="md"
    >
      <AiAgentForm
        hideFooter
        formId={FORM_ID}
        defaultValues={defaultValues}
        onPendingChange={setIsPending}
        onSuccess={(agent) => {
          onCreated?.(agent)
          onOpenChange(false)
        }}
      />
    </FormDialogShell>
  )
}
