'use client'

import { InputMask } from '@react-input/mask'
import { useEffect, useRef } from 'react'
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
import { CNPJ_MASK, CPF_MASK, formatDocumentForMask } from '@/lib/masks'

import { PERSON_TYPE_OPTIONS } from '../lib/constants'
import type { ClientFormValues } from '../lib/types'
import { isValidCnpj, isValidCpf } from '../lib/validation'

interface IdentificationFieldsProps {
  readonly disabled?: boolean
}

export function IdentificationFields({ disabled }: IdentificationFieldsProps) {
  const form = useFormContext<ClientFormValues>()
  const personType = useWatch({ control: form.control, name: 'personType' })
  const isCompany = personType === 'COMPANY'
  const documentValue = useWatch({ control: form.control, name: 'document' })
  const isDocumentValid = isCompany
    ? isValidCnpj(documentValue ?? '')
    : isValidCpf(documentValue ?? '')
  const documentDirty = Boolean(form.formState.dirtyFields.document)
  const hasDocumentError = Boolean(form.formState.errors.document)
  const showValidChip = documentDirty && !hasDocumentError && isDocumentValid
  const errors = form.formState.errors
  const documentMask = isCompany ? CNPJ_MASK : CPF_MASK
  const autoFocusedRef = useRef(false)
  useEffect(() => {
    if (disabled) return
    if (!isDocumentValid) {
      autoFocusedRef.current = false
      return
    }
    if (autoFocusedRef.current) return
    const legalName = form.getValues('legalName')
    if (legalName && legalName.length > 0) return
    autoFocusedRef.current = true
    form.setFocus('legalName')
  }, [isDocumentValid, form, disabled])
  return (
    <>
      <FormField label="Tipo" error={errors.personType?.message} required>
        {(id) => (
          <Controller
            control={form.control}
            name="personType"
            render={({ field }) => (
              <Select
                value={field.value ?? 'INDIVIDUAL'}
                onValueChange={(value) => {
                  if (value !== null) {
                    field.onChange(value)
                    form.setValue('document', '', { shouldDirty: false })
                    form.clearErrors('document')
                  }
                }}
                items={PERSON_TYPE_OPTIONS}
                disabled={disabled}
              >
                <SelectTrigger id={id}>
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
        )}
      </FormField>
      <FormField
        label={isCompany ? 'CNPJ' : 'CPF'}
        error={errors.document?.message}
        hint={showValidChip ? '✓ válido' : undefined}
        required
      >
        {(id) => (
          <Controller
            control={form.control}
            name="document"
            render={({ field }) => (
              <InputMask
                id={id}
                component={Input}
                mask={documentMask.mask}
                replacement={documentMask.replacement}
                placeholder={
                  isCompany ? '00.000.000/0000-00' : '000.000.000-00'
                }
                inputMode="numeric"
                disabled={disabled}
                aria-invalid={errors.document ? 'true' : undefined}
                aria-describedby={errors.document ? `${id}-error` : undefined}
                {...field}
                value={formatDocumentForMask(
                  typeof field.value === 'string' ? field.value : ''
                )}
              />
            )}
          />
        )}
      </FormField>
      <FormField
        label={isCompany ? 'Razão social' : 'Nome completo'}
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
    </>
  )
}
