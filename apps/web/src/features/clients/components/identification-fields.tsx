'use client'

import { Controller, useFormContext, useWatch } from 'react-hook-form'

import { FormField } from '@/components/shared/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { PERSON_TYPE_OPTIONS } from '../lib/constants'
import type { ClientFormValues } from '../lib/types'

export function IdentificationFields() {
  const form = useFormContext<ClientFormValues>()
  const personType = useWatch({ control: form.control, name: 'personType' })
  const isCompany = personType === 'COMPANY'
  const errors = form.formState.errors
  return (
    <div className="space-y-4">
      <FormField label="Tipo" error={errors.personType?.message} required>
        <Controller
          control={form.control}
          name="personType"
          render={({ field }) => (
            <Select
              value={field.value ?? 'INDIVIDUAL'}
              onValueChange={(value) => {
                if (value !== null) field.onChange(value)
              }}
              items={PERSON_TYPE_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = PERSON_TYPE_OPTIONS.find(
                      (option) => option.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PERSON_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <FormField
        label={isCompany ? 'CNPJ' : 'CPF'}
        error={errors.document?.message}
        required
      >
        <Input
          placeholder="Apenas números"
          inputMode="numeric"
          {...form.register('document')}
        />
      </FormField>
      <FormField
        label={isCompany ? 'Razão social' : 'Nome legal'}
        error={errors.legalName?.message}
        required
      >
        <Input
          placeholder={
            isCompany ? 'Razão social da empresa' : 'Nome completo do titular'
          }
          {...form.register('legalName')}
        />
      </FormField>
    </div>
  )
}
