'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import type { z } from 'zod'

import { FormActions } from '@/components/shared/form-actions'
import { FormField } from '@/components/shared/form-field'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { CreateAssistanceBody } from '@/api/endpoints/assistances/assistances.zod'

import { useCreateAssistance } from '../hooks/use-assistances'
import { formatDateToISO, parseDateString } from '../lib/date-helpers'
import { AssistanceFormDataSection } from './assistance-form-data-section'

type AssistanceFormValues = z.infer<typeof CreateAssistanceBody>

const EMPTY_ASSISTANCE_FORM_VALUES: AssistanceFormValues = {
  policyId: '',
  clientId: '',
  claimId: '',
  type: '',
  description: '',
  address: '',
  providerName: '',
  providerPhone: '',
  scheduledAt: '',
}

interface AssistanceFormProps {
  readonly onSuccess?: (assistanceId: string) => void
  readonly onCancel?: () => void
  readonly onPendingChange?: (pending: boolean) => void
  readonly hideFooter?: boolean
  readonly formId?: string
}

export function AssistanceForm({
  onSuccess,
  onCancel,
  onPendingChange,
  hideFooter,
  formId,
}: AssistanceFormProps) {
  const router = useRouter()
  const createAssistance = useCreateAssistance()
  const form = useForm<AssistanceFormValues>({
    resolver: zodResolver(CreateAssistanceBody),
    mode: 'onBlur',
    defaultValues: EMPTY_ASSISTANCE_FORM_VALUES,
  })
  const [clientDisplayName, setClientDisplayName] = useState('')
  const isPending = createAssistance.isPending
  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])
  const handlePolicySelect = useCallback(
    (selection: { policyId: string; clientId: string; clientName: string }) => {
      form.setValue('policyId', selection.policyId, { shouldValidate: true })
      form.setValue('clientId', selection.clientId, { shouldValidate: true })
      setClientDisplayName(selection.clientName)
    },
    [form]
  )
  function handleSubmit(values: AssistanceFormValues) {
    createAssistance.mutate(values, {
      onSuccess: (response) => {
        const id = response.data.data.id
        if (onSuccess) {
          onSuccess(id)
          return
        }
        router.push('/assistances')
      },
    })
  }
  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    router.push('/assistances')
  }
  const errors = form.formState.errors
  return (
    <FormProvider {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8"
        noValidate
      >
        <FormSection
          title="Dados"
          description="Informações básicas da assistência."
        >
          <AssistanceFormDataSection
            form={form}
            clientDisplayName={clientDisplayName}
            onPolicySelect={handlePolicySelect}
          />
        </FormSection>

        <FormSection title="Detalhes" description="Descrição e localização.">
          <FormGrid columns={2}>
            <FormField
              label="Descrição"
              span="full"
              error={errors.description?.message}
            >
              <Textarea
                placeholder="Descreva a assistência..."
                rows={4}
                {...form.register('description')}
              />
            </FormField>
            <FormField label="Endereço" error={errors.address?.message}>
              <Input
                placeholder="Endereço do local"
                {...form.register('address')}
              />
            </FormField>
            <FormField label="Prestador" error={errors.providerName?.message}>
              <Input
                placeholder="Nome do prestador"
                {...form.register('providerName')}
              />
            </FormField>
            <FormField
              label="Telefone do prestador"
              span="full"
              error={errors.providerPhone?.message}
            >
              <Input
                placeholder="(11) 99999-9999"
                {...form.register('providerPhone')}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Agendamento"
          description="Data programada para a assistência."
        >
          <FormGrid columns={2}>
            <FormField
              label="Data agendada"
              error={errors.scheduledAt?.message}
            >
              <Controller
                name="scheduledAt"
                control={form.control}
                render={({ field }) => (
                  <DatePicker
                    value={parseDateString(field.value)}
                    onChange={(date) => field.onChange(formatDateToISO(date))}
                  />
                )}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {!hideFooter && (
          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              Registrar assistência
            </Button>
          </FormActions>
        )}
      </form>
    </FormProvider>
  )
}
