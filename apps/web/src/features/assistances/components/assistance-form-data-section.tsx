'use client'

import { Controller, type UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'

import { FormField } from '@/components/shared/form-field'
import { PolicySearch } from '@/components/shared/policy-search'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateAssistanceBody } from '@/api/endpoints/assistances/assistances.zod'

import { ASSISTANCE_TYPE_OPTIONS } from '../lib/constants'

type AssistanceFormValues = z.infer<typeof CreateAssistanceBody>

interface AssistanceFormDataSectionProps {
  readonly form: UseFormReturn<AssistanceFormValues>
  readonly clientDisplayName: string
  readonly onPolicySelect: (selection: {
    policyId: string
    clientId: string
    clientName: string
  }) => void
}

export function AssistanceFormDataSection({
  form,
  clientDisplayName,
  onPolicySelect,
}: AssistanceFormDataSectionProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Apólice"
          error={form.formState.errors.policyId?.message}
          required
        >
          <PolicySearch
            value={form.watch('policyId')}
            onChange={onPolicySelect}
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
                  <SelectValue placeholder="Selecione o tipo">
                    {(value: string) =>
                      ASSISTANCE_TYPE_OPTIONS.find((opt) => opt.value === value)
                        ?.label ?? null
                    }
                  </SelectValue>
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
    </>
  )
}
