'use client'

import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { InputMask } from '@react-input/mask'

import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { documentMask, PHONE_MASK } from '@/lib/masks'

import { MARITAL_OPTIONS, TYPE_OPTIONS } from '../lib/constants'
import type { ClientFormValues } from '../lib/schemas'
import { FormField } from './form-field'

const MARITAL_SELECT_OPTIONS = [
  { value: '', label: 'Selecione' },
  ...MARITAL_OPTIONS,
] as const

export function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

export function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface ClientFormFieldsProps {
  readonly form: UseFormReturn<ClientFormValues>
  readonly isReadOnly: boolean
}

export function ClientFormFields({ form, isReadOnly }: ClientFormFieldsProps) {
  return (
    <>
      <FormField
        label="Nome"
        error={form.formState.errors.name?.message}
        required
      >
        <Input placeholder="Nome completo" {...form.register('name')} />
      </FormField>

      <FormField
        label="Documento (CPF/CNPJ)"
        error={form.formState.errors.document?.message}
        required
      >
        <Controller
          name="document"
          control={form.control}
          render={({ field }) => (
            <InputMask
              component={Input}
              mask={documentMask(field.value ?? '').mask}
              replacement={documentMask(field.value ?? '').replacement}
              placeholder="000.000.000-00"
              disabled={isReadOnly}
              {...field}
            />
          )}
        />
      </FormField>

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

      <FormField label="E-mail" error={form.formState.errors.email?.message}>
        <Input
          type="email"
          placeholder="email@exemplo.com"
          {...form.register('email')}
        />
      </FormField>

      <FormField label="Telefone" error={form.formState.errors.phone?.message}>
        <Controller
          name="phone"
          control={form.control}
          render={({ field }) => (
            <InputMask
              component={Input}
              mask={PHONE_MASK.mask}
              replacement={PHONE_MASK.replacement}
              placeholder="(00) 00000-0000"
              {...field}
              value={field.value ?? ''}
            />
          )}
        />
      </FormField>

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
  )
}
