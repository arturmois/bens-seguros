'use client'

import { parseFlexibleDate } from '@repo/shared/date-utils'
import { Controller, useFormContext, useWatch } from 'react-hook-form'

import { DatePicker } from '@/components/ui/date-picker'
import { FormField } from '@/components/shared/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { MARITAL_STATUS_OPTIONS } from '../lib/constants'
import type { ClientFormValues } from '../lib/types'

function parseIsoToDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  return parseFlexibleDate(value) ?? undefined
}

function formatDateToIso(date: Date | undefined): string | null {
  if (!date) return null
  return date.toISOString()
}

export function PersonalInfoFields() {
  const form = useFormContext<ClientFormValues>()
  const personType = useWatch({ control: form.control, name: 'personType' })
  if (personType === 'COMPANY') return null
  const errors = form.formState.errors
  return (
    <div className="space-y-4">
      <FormField label="Profissão" error={errors.profession?.message}>
        <Input
          placeholder="Ex.: Engenheiro civil"
          {...form.register('profession')}
        />
      </FormField>
      <FormField label="Estado civil" error={errors.maritalStatus?.message}>
        <Controller
          control={form.control}
          name="maritalStatus"
          render={({ field }) => (
            <Select
              value={field.value ?? null}
              onValueChange={(value) => field.onChange(value)}
              items={MARITAL_STATUS_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = MARITAL_STATUS_OPTIONS.find(
                      (option) => option.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MARITAL_STATUS_OPTIONS.map((option) => (
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
        label="Data de nascimento"
        error={errors.fiscalBirthDate?.message}
      >
        <Controller
          control={form.control}
          name="fiscalBirthDate"
          render={({ field }) => (
            <DatePicker
              value={parseIsoToDate(field.value)}
              onChange={(date) => field.onChange(formatDateToIso(date))}
            />
          )}
        />
      </FormField>
    </div>
  )
}
