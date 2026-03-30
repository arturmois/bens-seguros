'use client'

import { useCallback, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/shared/form-field'
import { PolicySearch } from '@/components/shared/policy-search'

import type { z } from 'zod'

import { CreateAssistanceBody } from '@/api/endpoints/assistances/assistances.zod'

import { ASSISTANCE_TYPE_OPTIONS } from '../lib/constants'
import { useCreateAssistance } from '../hooks/use-assistances'

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

function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <SectionHeader
        title="Dados"
        subtitle="Informações básicas da assistência."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Apólice"
          error={form.formState.errors.policyId?.message}
          required
        >
          <PolicySearch
            value={form.watch('policyId')}
            onChange={handlePolicySelect}
          />
        </FormField>
        <FormField
          label="Cliente"
          error={form.formState.errors.clientId?.message}
          required
        >
          <Input
            placeholder="Preenchido automaticamente pela apólice"
            value={clientDisplayName}
            readOnly
            disabled
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Sinistro (opcional)"
          error={form.formState.errors.claimId?.message}
        >
          <Input placeholder="ID do sinistro" {...form.register('claimId')} />
        </FormField>
        <FormField
          label="Tipo"
          error={form.formState.errors.type?.message}
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
                items={ASSISTANCE_TYPE_OPTIONS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ASSISTANCE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      <Separator />
      <SectionHeader title="Detalhes" subtitle="Descrição e localização." />

      <FormField
        label="Descrição"
        error={form.formState.errors.description?.message}
      >
        <Textarea
          placeholder="Descreva a assistência..."
          rows={4}
          {...form.register('description')}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <FormField
        label="Telefone do Prestador"
        error={form.formState.errors.providerPhone?.message}
      >
        <Input
          placeholder="(11) 99999-9999"
          {...form.register('providerPhone')}
        />
      </FormField>

      <Separator />
      <SectionHeader
        title="Agendamento"
        subtitle="Data programada para a assistência."
      />

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

      <Separator />

      <div className="flex justify-end gap-3">
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
      </div>
    </form>
  )
}

function SectionHeader({
  title,
  subtitle,
}: {
  readonly title: string
  readonly subtitle: string
}) {
  return (
    <div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </div>
  )
}
