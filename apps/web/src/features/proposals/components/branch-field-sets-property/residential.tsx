'use client'

import { Controller } from 'react-hook-form'

import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  CONSTRUCTION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_USAGE_OPTIONS,
} from '../../lib/branch-options'
import type { FieldHelperProps } from '../branch-field-sets'
import { FieldWrapper } from '../branch-field-sets'

export function ResidentialFields({
  register,
  control,
  setValue,
}: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Tipo de Imóvel" name="propertyType" required>
        {(id) => (
          <Controller
            name="propertyType"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value ?? '')}
                onValueChange={field.onChange}
                items={PROPERTY_TYPE_OPTIONS}
              >
                <SelectTrigger id={id}>
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
        )}
      </FieldWrapper>
      <FieldWrapper label="Uso do Imóvel" name="propertyUsage" required>
        {(id) => (
          <Controller
            name="propertyUsage"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value ?? '')}
                onValueChange={field.onChange}
                items={PROPERTY_USAGE_OPTIONS}
              >
                <SelectTrigger id={id}>
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
        )}
      </FieldWrapper>
      <AddressFieldsWithCep
        control={control}
        register={register}
        setValue={setValue}
        required={{ cep: true }}
      />
      <FieldWrapper label="Construção" name="construction">
        {(id) => (
          <Controller
            name="construction"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value ?? '')}
                onValueChange={field.onChange}
                items={CONSTRUCTION_OPTIONS}
              >
                <SelectTrigger id={id}>
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
        )}
      </FieldWrapper>
      <FieldWrapper label="Área (m²)" name="areaM2">
        <Input
          type="number"
          placeholder="Ex: 120"
          {...register('areaM2', { valueAsNumber: true })}
        />
      </FieldWrapper>
    </>
  )
}
