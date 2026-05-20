'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import * as zod from 'zod'

import { FormDialogShell } from '@/components/shared/form-dialog-shell'
import { FormField } from '@/components/shared/form-field'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { CreateEndorsementBody } from '@/api/endpoints/endorsements/endorsements.zod'
import type { CreateEndorsementBodyChanges } from '@/api/model'

import { useCreateEndorsement } from '../hooks/use-endorsements'
import { ENDORSEMENT_TYPE_OPTIONS } from '../lib/constants'

const FORM_ID = 'create-endorsement-form'

const endorsementFormSchema = CreateEndorsementBody.pick({
  type: true,
  description: true,
  effectiveDate: true,
}).extend({
  previousVersionSnapshot: zod.string().optional().or(zod.literal('')),
  changes: zod.string().optional().or(zod.literal('')),
})

type EndorsementFormValues = zod.infer<typeof endorsementFormSchema>

const EMPTY_VALUES: EndorsementFormValues = {
  type: '',
  description: '',
  effectiveDate: '',
  previousVersionSnapshot: '',
  changes: '',
}

interface EndorsementFormProps {
  readonly policyId: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  return date.toISOString()
}

function isRecord(value: unknown): value is CreateEndorsementBodyChanges {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJsonSafe(value: string): CreateEndorsementBodyChanges {
  if (!value.trim()) return {}
  try {
    const parsed: unknown = JSON.parse(value)
    if (isRecord(parsed)) {
      return parsed
    }
    return {}
  } catch {
    return {}
  }
}

export function EndorsementForm({
  policyId,
  open,
  onOpenChange,
}: EndorsementFormProps) {
  const createEndorsement = useCreateEndorsement()
  const form = useForm<EndorsementFormValues>({
    resolver: zodResolver(endorsementFormSchema),
    mode: 'onBlur',
    defaultValues: EMPTY_VALUES,
  })
  useEffect(() => {
    if (!open) return
    form.reset(EMPTY_VALUES)
  }, [open, form])
  function handleSubmit(values: EndorsementFormValues) {
    createEndorsement.mutate(
      {
        policyId,
        type: values.type,
        description: values.description,
        effectiveDate: values.effectiveDate,
        previousVersionSnapshot: parseJsonSafe(
          values.previousVersionSnapshot ?? ''
        ),
        changes: parseJsonSafe(values.changes ?? ''),
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }
  const errors = form.formState.errors
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Novo endosso"
      description="Registre um novo endosso para esta apólice."
      formId={FORM_ID}
      isPending={createEndorsement.isPending}
      submitLabel="Registrar"
      keyboardHintAction="registrar"
      size="md"
    >
      <FormProvider {...form}>
        <form
          id={FORM_ID}
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-8"
          noValidate
        >
          <FormSection title="Dados do endosso">
            <FormGrid columns={2}>
              <FormField label="Tipo" error={errors.type?.message} required>
                <Controller
                  name="type"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        if (v !== null) field.onChange(v)
                      }}
                      items={ENDORSEMENT_TYPE_OPTIONS}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo">
                          {(value: string) =>
                            ENDORSEMENT_TYPE_OPTIONS.find(
                              (opt) => opt.value === value
                            )?.label ?? null
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ENDORSEMENT_TYPE_OPTIONS.map((opt) => (
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
                label="Data efetiva"
                error={errors.effectiveDate?.message}
                required
              >
                <Controller
                  name="effectiveDate"
                  control={form.control}
                  render={({ field }) => (
                    <DatePicker
                      value={parseDateString(field.value)}
                      onChange={(date) => field.onChange(formatDateToISO(date))}
                    />
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
                  placeholder="Descreva o endosso..."
                  rows={3}
                  {...form.register('description')}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection
            title="Snapshot e alterações"
            description="Use JSON para registrar o estado anterior e os campos alterados."
          >
            <FormGrid columns={2}>
              <FormField label="Dados anteriores (JSON)" span="full">
                <Textarea
                  placeholder='{"campo": "valor_anterior"}'
                  rows={3}
                  {...form.register('previousVersionSnapshot')}
                />
              </FormField>
              <FormField label="Alterações (JSON)" span="full">
                <Textarea
                  placeholder='{"campo": "novo_valor"}'
                  rows={3}
                  {...form.register('changes')}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </form>
      </FormProvider>
    </FormDialogShell>
  )
}
