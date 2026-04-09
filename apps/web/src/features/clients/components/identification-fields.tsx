'use client'

import { Controller, useFormContext } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDocument, stripDocument } from '@/lib/masks'

import type { ClientFormValues } from '../lib/types'
import { FormField } from '@/components/shared/form-field'
import { PersonalInfoFields } from './personal-info-fields'

const PERSON_TYPE_OPTIONS = [
  { value: 'INDIVIDUAL', label: 'Pessoa Física' },
  { value: 'COMPANY', label: 'Pessoa Jurídica' },
] as const

interface IdentificationFieldsProps {
  readonly isReadOnly: boolean
}

export function IdentificationFields({
  isReadOnly,
}: IdentificationFieldsProps) {
  const form = useFormContext<ClientFormValues>()
  const personType = form.watch('personType') ?? 'INDIVIDUAL'
  const isCompany = personType === 'COMPANY'

  return (
    <section>
      <h2 className="text-muted-foreground mb-4 text-sm font-semibold">
        Identificação
      </h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr]">
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
            placeholder={
              isCompany ? 'Razão social da empresa' : 'Nome completo'
            }
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
                placeholder={
                  isCompany ? '00.000.000/0000-00' : '000.000.000-00'
                }
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
      </div>

      <PersonalInfoFields isCompany={isCompany} />
    </section>
  )
}
