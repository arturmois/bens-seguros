'use client'

import { Loader2 } from 'lucide-react'
import React from 'react'
import { Controller } from 'react-hook-form'
import { toast } from 'sonner'

import type { LookupVehicle200Data } from '@/api/model/lookupVehicle200Data'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useVehicleLookup } from '@/features/proposals/hooks/use-vehicle-lookup'
import { isValidPlate, normalizePlate } from '@/features/proposals/lib/plate'
import { isValidVin, normalizeVin } from '@/features/proposals/lib/vin'

import {
  FUEL_TYPE_OPTIONS,
  VEHICLE_USAGE_OPTIONS,
} from '../../lib/branch-options'
import { FieldWrapper } from './field-wrapper'
import type { FieldHelperProps } from './types'

export function AutoFields({
  register,
  control,
  setValue,
  getValues,
  proposalId,
}: FieldHelperProps) {
  const lookup = useVehicleLookup()
  const plateField = register('licensePlate')
  const vinField = register('vin')

  function fillEmptyFields(data: LookupVehicle200Data) {
    let filled = 0

    const setIfEmpty = (field: string, value: unknown) => {
      // Treat numeric 0 as empty — the API may return 0 for unparseable years,
      // and 0 is never a valid model/manufacturing year.
      if (value === null || value === undefined || value === '' || value === 0)
        return
      const current = getValues(field)
      if (
        current !== undefined &&
        current !== null &&
        current !== '' &&
        current !== 0
      )
        return
      setValue(field, value, { shouldDirty: true, shouldValidate: true })
      filled++
    }

    setIfEmpty('brand', data.brand)
    setIfEmpty('model', data.model)
    setIfEmpty('manufacturingYear', data.manufacturingYear)
    setIfEmpty('modelYear', data.modelYear)
    setIfEmpty('color', data.color)
    setIfEmpty('fuelType', data.fuelType)
    setIfEmpty('vin', data.chassi)

    if (filled > 0) {
      toast.success('Dados do veículo preenchidos')
    }
  }

  async function handlePlateBlur(e: React.FocusEvent<HTMLInputElement>) {
    const plate = normalizePlate(e.target.value)
    if (!isValidPlate(plate)) return
    try {
      const result = await lookup.mutateAsync({ data: { plate, proposalId } })
      fillEmptyFields(result.data.data)
    } catch {
      // onError in useVehicleLookup handles the toast
    }
  }

  async function handleVinBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (getValues('licensePlate')) return
    const vin = normalizeVin(e.target.value)
    if (!isValidVin(vin)) return
    try {
      const result = await lookup.mutateAsync({
        data: { chassi: vin, proposalId },
      })
      fillEmptyFields(result.data.data)
    } catch {
      // onError in useVehicleLookup handles the toast
    }
  }

  return (
    <div aria-busy={lookup.isPending}>
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
        <Input
          placeholder="Ex: ABC1D23"
          {...plateField}
          onBlur={(e) => {
            void plateField.onBlur(e)
            void handlePlateBlur(e)
          }}
        />
        {lookup.isPending && (
          <p
            role="status"
            aria-live="polite"
            className="text-muted-foreground flex items-center gap-1 text-xs"
          >
            <Loader2 className="size-3 animate-spin" />
            Buscando dados do veículo...
          </p>
        )}
      </FieldWrapper>
      <FieldWrapper label="Chassi">
        <Input
          placeholder="Chassi do veículo"
          {...vinField}
          onBlur={(e) => {
            void vinField.onBlur(e)
            void handleVinBlur(e)
          }}
        />
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
    </div>
  )
}
