'use client'

import { Controller, useFormContext } from 'react-hook-form'
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
import { formatDocument, stripDocument, PHONE_MASK } from '@/lib/masks'

import { MARITAL_OPTIONS, TYPE_OPTIONS } from '../lib/constants'
import { FormField } from './form-field'
import { SocialMediaFields } from './social-media-fields'

// Matches ClientFormSchema defined in client-form.tsx (Orval regen in Task 6 will consolidate)
interface ClientFormValues {
  name: string
  document: string
  personType?: 'INDIVIDUAL' | 'COMPANY'
  type?: 'LEAD' | 'CLIENT' | 'FORMER_CLIENT'
  email?: string
  phone?: string
  birthDate?: string
  profession?: string
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER'
  socialMedia?: {
    instagram?: string
    facebook?: string
    linkedin?: string
    tiktok?: string
  }
}

const PERSON_TYPE_OPTIONS = [
  { value: 'INDIVIDUAL', label: 'Pessoa Física' },
  { value: 'COMPANY', label: 'Pessoa Jurídica' },
] as const

const MARITAL_SELECT_OPTIONS = [
  { value: '', label: 'Selecione' },
  ...MARITAL_OPTIONS,
] as const

export function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = value.includes('T')
    ? new Date(value)
    : new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

export function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00:00.000Z`
}

interface ClientFormFieldsProps {
  readonly form?: never
  readonly isReadOnly: boolean
}

export function ClientFormFields({ isReadOnly }: ClientFormFieldsProps) {
  const form = useFormContext<ClientFormValues>()
  const personType = form.watch('personType') ?? 'INDIVIDUAL'
  const isCompany = personType === 'COMPANY'

  return (
    <>
      <FormField label="Tipo de Pessoa">
        <Controller
          name="personType"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value ?? 'INDIVIDUAL'}
              onValueChange={(v) => {
                field.onChange(v)
                form.setValue('document', '')
              }}
              items={PERSON_TYPE_OPTIONS}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = PERSON_TYPE_OPTIONS.find(
                      (o) => o.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PERSON_TYPE_OPTIONS.map((opt) => (
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
        label={isCompany ? 'Razão Social' : 'Nome'}
        error={form.formState.errors.name?.message}
        required
      >
        <Input
          placeholder={isCompany ? 'Razão social da empresa' : 'Nome completo'}
          {...form.register('name')}
        />
      </FormField>

      <FormField
        label={isCompany ? 'CNPJ' : 'CPF'}
        error={form.formState.errors.document?.message}
        required
      >
        <Controller
          name="document"
          control={form.control}
          render={({ field }) => (
            <Input
              placeholder={isCompany ? '00.000.000/0000-00' : '000.000.000-00'}
              disabled={isReadOnly}
              value={formatDocument(field.value ?? '')}
              onChange={(e) => {
                const raw = stripDocument(e.target.value)
                field.onChange(raw)
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
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

      <SocialMediaFields />
    </>
  )
}
