'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { z } from 'zod'

import { FormDialogShell } from '@/components/shared/form-dialog-shell'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'

import { CreateProposalBody } from '@/api/endpoints/proposals/proposals.zod'
import { QuickCreateContact } from '@/features/contacts/components/quick-create-contact'

import { useCreateProposal } from '../hooks/use-proposals'
import {
  BOARD_TYPE_LABELS,
  BOARD_TYPES,
  BRANCH_LABELS,
  BRANCHES,
} from '../lib/constants'
import { ProposalFormFields } from './proposal-form-fields'

type ProposalFormValues = z.infer<typeof CreateProposalBody>

const FORM_ID = 'create-proposal-form'

const BRANCH_OPTIONS = BRANCHES.map((b) => ({
  value: b,
  label: BRANCH_LABELS[b],
}))
const BOARD_TYPE_OPTIONS = BOARD_TYPES.filter((bt) => bt !== 'ENDORSEMENT').map(
  (bt) => ({
    value: bt,
    label: BOARD_TYPE_LABELS[bt],
  })
)

interface ProposalFormProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function ProposalForm({ open, onOpenChange }: ProposalFormProps) {
  const createMutation = useCreateProposal()
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(CreateProposalBody),
    mode: 'onBlur',
    defaultValues: {
      contactId: '',
    },
  })
  const boardType = form.watch('boardType')
  function handleSubmit(values: ProposalFormValues) {
    createMutation.mutate(values, {
      onSuccess: () => {
        form.reset()
        onOpenChange(false)
      },
    })
  }
  function handleContactCreated(contactId: string) {
    form.setValue('contactId', contactId, { shouldValidate: true })
  }
  return (
    <>
      <FormDialogShell
        open={open}
        onOpenChange={onOpenChange}
        title="Nova proposta"
        description="Preencha os dados para criar uma nova proposta."
        formId={FORM_ID}
        isPending={createMutation.isPending}
        submitLabel="Criar proposta"
        keyboardHintAction="criar"
        size="md"
      >
        <FormProvider {...form}>
          <form
            id={FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
            noValidate
          >
            <FormSection title="Dados">
              <FormGrid columns={2}>
                <ProposalFormFields
                  control={form.control}
                  boardType={boardType}
                  branchOptions={BRANCH_OPTIONS}
                  boardTypeOptions={BOARD_TYPE_OPTIONS}
                  onCreateContact={() => setQuickCreateOpen(true)}
                />
              </FormGrid>
            </FormSection>
          </form>
        </FormProvider>
      </FormDialogShell>
      <QuickCreateContact
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        onCreated={handleContactCreated}
      />
    </>
  )
}
