'use client'

import { Controller } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  FUEL_TYPE_OPTIONS,
  VEHICLE_USAGE_OPTIONS,
} from '../../lib/branch-options'
import type { FieldHelperProps } from './types'
import { FieldWrapper } from './field-wrapper'

export function AutoFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Marca" required>
        <Input placeholder="Ex: Volkswagen" {...register('brand')} />
      </FieldWrapper>
      <FieldWrapper label="Modelo" required>
        <Input placeholder="Ex: Gol 1.6" {...register('model')} />
      </FieldWrapper>
      <FieldWrapper label="Ano Fabricação" required>
        <Input
          type="number"
          placeholder="Ex: 2024"
          {...register('manufacturingYear', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Ano Modelo" required>
        <Input
          type="number"
          placeholder="Ex: 2025"
          {...register('modelYear', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Placa">
        <Input placeholder="Ex: ABC1D23" {...register('licensePlate')} />
      </FieldWrapper>
      <FieldWrapper label="Chassi">
        <Input placeholder="Chassi do veículo" {...register('vin')} />
      </FieldWrapper>
      <FieldWrapper label="Cor">
        <Input placeholder="Ex: Prata" {...register('color')} />
      </FieldWrapper>
      <FieldWrapper label="Combustível">
        <Controller
          name="fuelType"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={FUEL_TYPE_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = FUEL_TYPE_OPTIONS.find(
                      (o) => o.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Uso do Veículo">
        <Controller
          name="vehicleUsage"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={VEHICLE_USAGE_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = VEHICLE_USAGE_OPTIONS.find(
                      (o) => o.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_USAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
    </>
  )
}
