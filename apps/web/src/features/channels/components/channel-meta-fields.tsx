'use client'

import { Controller } from 'react-hook-form'
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form'

import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { ChannelFormValues } from '../lib/schemas'

const BROKER_TYPE_OPTIONS = [
  { value: 'BAILEYS', label: 'Baileys (WhatsApp Web)' },
  { value: 'META', label: 'Meta (API Oficial)' },
] as const

interface ChannelBrokerTypeSelectProps {
  readonly control: Control<ChannelFormValues>
  readonly disabled?: boolean
  readonly error?: string
}

export function ChannelBrokerTypeSelect({
  control,
  disabled,
  error,
}: ChannelBrokerTypeSelectProps) {
  return (
    <FormField
      label="Tipo de Conexão"
      error={error}
      helperText="Baileys conecta via QR Code. Meta usa a API oficial do WhatsApp Business."
      required
    >
      <Controller
        name="brokerType"
        control={control}
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo">
                {(value: string | null) => {
                  const item = BROKER_TYPE_OPTIONS.find(
                    (o) => o.value === value
                  )
                  return item?.label ?? null
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BROKER_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FormField>
  )
}

interface ChannelMetaFieldsProps {
  readonly register: UseFormRegister<ChannelFormValues>
  readonly errors: FieldErrors<ChannelFormValues>
}

export function ChannelMetaFields({
  register,
  errors,
}: ChannelMetaFieldsProps) {
  return (
    <>
      <FormField label="Token" error={errors.metaToken?.message} required>
        <Input
          type="password"
          placeholder="Token de acesso permanente"
          {...register('metaToken')}
        />
      </FormField>

      <FormField
        label="Phone Number ID"
        error={errors.phoneNumberId?.message}
        required
      >
        <Input
          placeholder="ID do número no Meta Business"
          {...register('phoneNumberId')}
        />
      </FormField>
    </>
  )
}
