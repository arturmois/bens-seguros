'use client'

import { useCallback, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

import type { z } from 'zod'

import { CreateClaimBody } from '@/api/endpoints/claims/claims.zod'

import { FormField } from '@/components/shared/form-field'
import { PolicySearch } from '@/components/shared/policy-search'
import { CLAIM_PRIORITY_OPTIONS } from '../lib/constants'
import { useCreateClaim } from '../hooks/use-claims'

type ClaimFormValues = z.infer<typeof CreateClaimBody>

const EMPTY_CLAIM_FORM_VALUES: ClaimFormValues = {
  policyId: '',
  clientId: '',
  insurerId: '',
  assignedToId: '',
  priority: 'NORMAL',
  description: '',
  incidentDate: '',
  incidentLocation: '',
}

const PRIORITY_SELECT_OPTIONS = [
  { value: '', label: 'Selecione' },
  ...CLAIM_PRIORITY_OPTIONS,
] as const

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

export function ClaimForm() {
  const router = useRouter()
  const createClaim = useCreateClaim()

  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(CreateClaimBody),
    defaultValues: EMPTY_CLAIM_FORM_VALUES,
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

  function handleSubmit(values: ClaimFormValues) {
    createClaim.mutate(values, {
      onSuccess: () => router.push('/claims'),
    })
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div>
        <h3 className="text-base font-medium">Dados do Sinistro</h3>
        <p className="text-muted-foreground text-sm">
          Informações básicas sobre o sinistro.
        </p>
      </div>

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

      <FormField
        label="Descrição"
        error={form.formState.errors.description?.message}
        required
      >
        <Textarea
          placeholder="Descreva o sinistro ocorrido..."
          rows={4}
          {...form.register('description')}
        />
      </FormField>

      <Separator />

      <div>
        <h3 className="text-base font-medium">Detalhes</h3>
        <p className="text-muted-foreground text-sm">
          Informações adicionais sobre o incidente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Prioridade"
          error={form.formState.errors.priority?.message}
        >
          <Controller
            name="priority"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => {
                  if (v) {
                    field.onChange(v)
                    return
                  }
                  field.onChange(undefined)
                }}
                items={PRIORITY_SELECT_OPTIONS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_SELECT_OPTIONS.map((opt) => (
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
          label="Data do Incidente"
          error={form.formState.errors.incidentDate?.message}
        >
          <Controller
            name="incidentDate"
            control={form.control}
            render={({ field }) => (
              <DatePicker
                value={parseDateString(field.value)}
                onChange={(date) => field.onChange(formatDateToISO(date))}
              />
            )}
          />
        </FormField>
      </div>

      <FormField
        label="Local do Incidente"
        error={form.formState.errors.incidentLocation?.message}
      >
        <Input
          placeholder="Endereço ou descrição do local"
          {...form.register('incidentLocation')}
        />
      </FormField>

      <Separator />

      <div>
        <h3 className="text-base font-medium">Seguradora</h3>
        <p className="text-muted-foreground text-sm">
          Dados da seguradora (opcional).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Seguradora"
          error={form.formState.errors.insurerId?.message}
        >
          <Input
            placeholder="ID da seguradora (opcional)"
            {...form.register('insurerId')}
          />
        </FormField>
      </div>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/claims')}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={createClaim.isPending}>
          {createClaim.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Registrar Sinistro
        </Button>
      </div>
    </form>
  )
}
