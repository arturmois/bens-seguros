'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import type { z } from 'zod'

import { FormDialogShell } from '@/components/shared/form-dialog-shell'
import { FormField } from '@/components/shared/form-field'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { CreateClaimOccurrenceBody } from '@/api/endpoints/claims/claims.zod'

import { useCreateOccurrence } from '../hooks/use-claims'

const FORM_ID = 'create-occurrence-form'

const OCCURRENCE_TYPE_OPTIONS = [
  { value: 'acompanhamento', label: 'Acompanhamento' },
  { value: 'comunicado', label: 'Comunicado' },
  { value: 'documento_solicitado', label: 'Documento solicitado' },
  { value: 'vistoria', label: 'Vistoria' },
  { value: 'parecer', label: 'Parecer' },
  { value: 'outro', label: 'Outro' },
] as const

const occurrenceFormSchema = CreateClaimOccurrenceBody.pick({
  type: true,
  description: true,
})

type OccurrenceFormValues = z.infer<typeof occurrenceFormSchema>

const EMPTY_VALUES: OccurrenceFormValues = {
  type: '',
  description: '',
}

interface OccurrenceFormProps {
  readonly claimId: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function OccurrenceForm({
  claimId,
  open,
  onOpenChange,
}: OccurrenceFormProps) {
  const createOccurrence = useCreateOccurrence()
  const form = useForm<OccurrenceFormValues>({
    resolver: zodResolver(occurrenceFormSchema),
    mode: 'onBlur',
    defaultValues: EMPTY_VALUES,
  })
  useEffect(() => {
    if (!open) return
    form.reset(EMPTY_VALUES)
  }, [open, form])
  function handleSubmit(values: OccurrenceFormValues) {
    createOccurrence.mutate(
      { claimId, type: values.type, description: values.description },
      { onSuccess: () => onOpenChange(false) }
    )
  }
  const errors = form.formState.errors
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Nova ocorrência"
      description="Registre uma nova ocorrência para este sinistro."
      formId={FORM_ID}
      isPending={createOccurrence.isPending}
      submitLabel="Registrar"
      keyboardHintAction="registrar"
      size="md"
    >
      <FormProvider {...form}>
        <form
          id={FORM_ID}
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
          noValidate
        >
          <FormSection title="Dados da ocorrência">
            <FormGrid columns={2}>
              <FormField
                label="Tipo"
                span="full"
                error={errors.type?.message}
                required
              >
                <Controller
                  name="type"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        if (v !== null) field.onChange(v)
                      }}
                      items={OCCURRENCE_TYPE_OPTIONS}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo">
                          {(value: string) =>
                            OCCURRENCE_TYPE_OPTIONS.find(
                              (opt) => opt.value === value
                            )?.label ?? null
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {OCCURRENCE_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label="Descrição"
                span="full"
                error={errors.description?.message}
                required
              >
                <Textarea
                  placeholder="Descreva a ocorrência..."
                  rows={4}
                  {...form.register('description')}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </form>
      </FormProvider>
    </FormDialogShell>
  )
}
