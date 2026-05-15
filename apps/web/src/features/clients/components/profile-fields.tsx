'use client'

import { Controller, useFormContext } from 'react-hook-form'

import { FormField } from '@/components/shared/form-field'
import { DatePicker } from '@/components/ui/date-picker'
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

export function ProfileFields() {
  const form = useFormContext<ClientFormValues>()
  const errors = form.formState.errors

  return (
    <>
      <FormField label="Profissão" error={errors.profession?.message}>
        <Input
          placeholder="Ex: Engenheira"
          maxLength={100}
          {...form.register('profession')}
        />
      </FormField>

      <FormField label="Estado civil" error={errors.maritalStatus?.message}>
        {(id) => (
          <Controller
            control={form.control}
            name="maritalStatus"
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(value) => {
                  if (value !== null && value.length > 0) field.onChange(value)
                }}
                items={MARITAL_STATUS_OPTIONS}
              >
                <SelectTrigger id={id}>
                  <SelectValue placeholder="Selecione">
                    {(value: string | null) => {
                      const item = MARITAL_STATUS_OPTIONS.find(
                        (o) => o.value === value
                      )
                      return item?.label ?? null
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>

      <FormField
        label="Data de nascimento fiscal"
        error={errors.fiscalBirthDate?.message}
      >
        {(id) => (
          <Controller
            control={form.control}
            name="fiscalBirthDate"
            render={({ field }) => (
              <DatePicker
                id={id}
                value={field.value ? new Date(field.value) : undefined}
                onChange={(date) =>
                  field.onChange(date ? date.toISOString() : null)
                }
              />
            )}
          />
        )}
      </FormField>
    </>
  )
}
