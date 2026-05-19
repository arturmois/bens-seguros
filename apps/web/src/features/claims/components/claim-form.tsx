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
import { PolicySearch } from '@/components/shared/policy-search'
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
import { Textarea } from '@/components/ui/textarea'

import { CreateClaimBody } from '@/api/endpoints/claims/claims.zod'

import { useCreateClaim } from '../hooks/use-claims'
import { CLAIM_PRIORITY_OPTIONS } from '../lib/constants'

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

interface ClaimFormProps {
  readonly onSuccess?: (claimId: string) => void
  readonly onCancel?: () => void
  readonly onPendingChange?: (pending: boolean) => void
  readonly hideFooter?: boolean
  readonly formId?: string
}

function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = value.includes('T')
    ? new Date(value)
    : new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00:00.000Z`
}

export function ClaimForm({
  onSuccess,
  onCancel,
  onPendingChange,
  hideFooter,
  formId,
}: ClaimFormProps) {
  const router = useRouter()
  const createClaim = useCreateClaim()
  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(CreateClaimBody),
    mode: 'onBlur',
    defaultValues: EMPTY_CLAIM_FORM_VALUES,
  })
  const [clientDisplayName, setClientDisplayName] = useState('')
  const isPending = createClaim.isPending
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
  function handleSubmit(values: ClaimFormValues) {
    createClaim.mutate(values, {
      onSuccess: (response) => {
        const id = response.data.data.id
        if (onSuccess) {
          onSuccess(id)
          return
        }
        router.push('/claims')
      },
    })
  }
  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    router.push('/claims')
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
          title="Dados do sinistro"
          description="Informações básicas sobre o sinistro."
        >
          <FormGrid columns={2}>
            <FormField
              label="Apólice"
              span="full"
              error={errors.policyId?.message}
              required
            >
              <PolicySearch
                value={form.watch('policyId')}
                onChange={handlePolicySelect}
              />
            </FormField>
            <FormField
              label="Cliente"
              error={errors.clientId?.message}
              required
            >
              <Input
                placeholder="Preenchido automaticamente pela apólice"
                value={clientDisplayName}
                readOnly
                disabled
              />
            </FormField>
            <FormField
              label="Descrição"
              span="full"
              error={errors.description?.message}
              required
            >
              <Textarea
                placeholder="Descreva o sinistro ocorrido..."
                rows={4}
                {...form.register('description')}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Detalhes"
          description="Informações adicionais sobre o incidente."
        >
          <FormGrid columns={2}>
            <FormField label="Prioridade" error={errors.priority?.message}>
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
                      <SelectValue placeholder="Selecione">
                        {(value: string) =>
                          PRIORITY_SELECT_OPTIONS.find(
                            (opt) => opt.value === value
                          )?.label ?? null
                        }
                      </SelectValue>
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
              label="Data do incidente"
              error={errors.incidentDate?.message}
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
            <FormField
              label="Local do incidente"
              span="full"
              error={errors.incidentLocation?.message}
            >
              <Input
                placeholder="Endereço ou descrição do local"
                {...form.register('incidentLocation')}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Seguradora"
          description="Dados da seguradora (opcional)."
        >
          <FormGrid columns={2}>
            <FormField label="Seguradora" error={errors.insurerId?.message}>
              <Input
                placeholder="ID da seguradora (opcional)"
                {...form.register('insurerId')}
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
              Registrar sinistro
            </Button>
          </FormActions>
        )}
      </form>
    </FormProvider>
  )
}
