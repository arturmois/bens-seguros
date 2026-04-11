'use client'

import { Controller } from 'react-hook-form'
import { InputMask } from '@react-input/mask'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CEP_MASK } from '@/lib/masks'

import {
  CONSTRUCTION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_USAGE_OPTIONS,
} from '../../lib/branch-options'
import type { FieldHelperProps } from '../branch-field-sets'
import { FieldWrapper } from '../branch-field-sets'

export function ResidentialFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Tipo de Imóvel" required>
        <Controller
          name="propertyType"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={PROPERTY_TYPE_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = PROPERTY_TYPE_OPTIONS.find(
                      (o) => o.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Uso do Imóvel" required>
        <Controller
          name="propertyUsage"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={PROPERTY_USAGE_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = PROPERTY_USAGE_OPTIONS.find(
                      (o) => o.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_USAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="CEP" required>
        <Controller
          name="cep"
          control={control}
          render={({ field }) => (
            <InputMask
              component={Input}
              mask={CEP_MASK.mask}
              replacement={CEP_MASK.replacement}
              placeholder="00000-000"
              {...field}
              value={String(field.value ?? '')}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Endereço">
        <Input placeholder="Rua, número, bairro" {...register('address')} />
      </FieldWrapper>
      <FieldWrapper label="Construção">
        <Controller
          name="construction"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={CONSTRUCTION_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = CONSTRUCTION_OPTIONS.find(
                      (o) => o.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CONSTRUCTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Área (m²)">
        <Input
          type="number"
          placeholder="Ex: 120"
          {...register('areaM2', { valueAsNumber: true })}
        />
      </FieldWrapper>
    </>
  )
}
