'use client'

import { Controller, useFormContext } from 'react-hook-form'

import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { MARITAL_OPTIONS, TYPE_OPTIONS } from '../lib/constants'
import type { ClientFormValues } from '../lib/types'
import { formatDateToISO, parseDateString } from '@/lib/date-utils'
import { FormField } from '@/components/shared/form-field'

const MARITAL_SELECT_OPTIONS = [
  { value: '', label: 'Selecione' },
  ...MARITAL_OPTIONS,
] as const

interface PersonalInfoFieldsProps {
  readonly isCompany: boolean
}

export function PersonalInfoFields({ isCompany }: PersonalInfoFieldsProps) {
  const form = useFormContext<ClientFormValues>()

  return (
    <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-4">
      <FormField label="Tipo" error={form.formState.errors.type?.message}>
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value ?? ''}
              onValueChange={(v) => {
                if (v !== null) field.onChange(v)
              }}
              items={TYPE_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = TYPE_OPTIONS.find((o) => o.value === value)
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      {!isCompany && (
        <>
          <FormField
            label="Data de Nascimento"
            error={form.formState.errors.birthDate?.message}
          >
            <Controller
              name="birthDate"
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
            label="Profissão"
            error={form.formState.errors.profession?.message}
          >
            <Input placeholder="Profissão" {...form.register('profession')} />
          </FormField>

          <FormField
            label="Estado Civil"
            error={form.formState.errors.maritalStatus?.message}
          >
            <Controller
              name="maritalStatus"
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
                  items={MARITAL_SELECT_OPTIONS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione">
                      {(value: string | null) => {
                        const item = MARITAL_SELECT_OPTIONS.find(
                          (o) => o.value === value
                        )
                        return item?.label ?? null
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_SELECT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </>
      )}
    </div>
  )
}
