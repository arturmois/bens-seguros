'use client'

import { Controller, type Control, type UseFormRegister } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

export interface AutoFillData {
  clientName?: string
  clientDocument?: string
  clientPersonType?: string
}

function stripToDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function AutoFilledBadge({
  value,
  originalValue,
}: {
  readonly value: string
  readonly originalValue: string
}) {
  if (!originalValue) return null
  const normalizedValue = stripToDigits(value) || value
  const normalizedOriginal = stripToDigits(originalValue) || originalValue
  if (normalizedValue !== normalizedOriginal) return null
  return (
    <span className="text-muted-foreground text-xs">
      Preenchido do cadastro do cliente
    </span>
  )
}

interface EquipmentToggleProps {
  name: string
  detailsName: string
  label: string
  placeholder: string
  control: Control
  register: UseFormRegister<Record<string, unknown>>
}

export function EquipmentToggle({
  name,
  detailsName,
  label,
  placeholder,
  control,
  register,
}: EquipmentToggleProps) {
  return (
    <div className="col-span-full space-y-2">
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              {label}
            </label>
            {field.value === true && (
              <Input placeholder={placeholder} {...register(detailsName)} />
            )}
          </>
        )}
      />
    </div>
  )
}
