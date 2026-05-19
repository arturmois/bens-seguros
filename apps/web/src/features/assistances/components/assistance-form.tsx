'use client'

import { useCallback, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { FormActions } from '@/components/shared/form-actions'
import { FormField } from '@/components/shared/form-field'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

import type { z } from 'zod'

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

export function AssistanceForm() {
  const router = useRouter()
  const createAssistance = useCreateAssistance()
  const form = useForm<AssistanceFormValues>({
    resolver: zodResolver(CreateAssistanceBody),
    defaultValues: EMPTY_ASSISTANCE_FORM_VALUES,
  })
  const [clientDisplayName, setClientDisplayName] = useState('')
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
      onSuccess: () => router.push('/assistances'),
    })
  }
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
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
            error={form.formState.errors.description?.message}
          >
            <Textarea
              placeholder="Descreva a assistência..."
              rows={4}
              {...form.register('description')}
            />
          </FormField>
          <FormField
            label="Endereço"
            error={form.formState.errors.address?.message}
          >
            <Input
              placeholder="Endereço do local"
              {...form.register('address')}
            />
          </FormField>
          <FormField
            label="Prestador"
            error={form.formState.errors.providerName?.message}
          >
            <Input
              placeholder="Nome do prestador"
              {...form.register('providerName')}
            />
          </FormField>
          <FormField
            label="Telefone do Prestador"
            span="full"
            error={form.formState.errors.providerPhone?.message}
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
            label="Data Agendada"
            error={form.formState.errors.scheduledAt?.message}
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

      <Separator />
      <FormActions gap={3} noPadding>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/assistances')}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={createAssistance.isPending}>
          {createAssistance.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Registrar Assistência
        </Button>
      </FormActions>
    </form>
  )
}
