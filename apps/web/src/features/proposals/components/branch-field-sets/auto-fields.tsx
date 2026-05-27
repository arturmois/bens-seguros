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

    const isEmpty = (value: unknown): boolean => {
      if (value === null || value === undefined || value === '' || value === 0)
        return true
      if (typeof value === 'number' && Number.isNaN(value)) return true
      return false
    }

    const setIfEmpty = (field: string, value: unknown) => {
      if (isEmpty(value)) return
      if (!isEmpty(getValues(field))) return
      setValue(field, value, { shouldDirty: true, shouldValidate: true })
      filled++
    }

    setIfEmpty('vehicle', data.vehicle)
    setIfEmpty('manufacturingYear', data.manufacturingYear)
    setIfEmpty('modelYear', data.modelYear)
    setIfEmpty('color', data.color)
    setIfEmpty('fuelType', data.fuelType)
    setIfEmpty('vin', data.chassi)

    if (filled > 0) {
      toast.success('Dados do veículo preenchidos')
    }
  }

  function handlePlateBlur(e: React.FocusEvent<HTMLInputElement>) {
    const plate = normalizePlate(e.target.value)
    if (!isValidPlate(plate)) return
    lookup.mutate(
      { data: { plate, proposalId } },
      { onSuccess: (result) => fillEmptyFields(result.data.data) }
    )
  }

  function handleVinBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (getValues('licensePlate')) return
    const vin = normalizeVin(e.target.value)
    if (!isValidVin(vin)) return
    lookup.mutate(
      { data: { chassi: vin, proposalId } },
      { onSuccess: (result) => fillEmptyFields(result.data.data) }
    )
  }

  return (
    <>
      <FieldWrapper label="Veículo" name="vehicle" required>
        <Input placeholder="Ex: Volkswagen Gol 1.6" {...register('vehicle')} />
      </FieldWrapper>
      <FieldWrapper label="Ano Fabricação" name="manufacturingYear" required>
        <Input
          type="number"
          placeholder="Ex: 2024"
          {...register('manufacturingYear', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Ano Modelo" name="modelYear" required>
        <Input
          type="number"
          placeholder="Ex: 2025"
          {...register('modelYear', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Placa" name="licensePlate">
        {(id) => (
          <>
            <Input
              id={id}
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
          </>
        )}
      </FieldWrapper>
      <FieldWrapper label="Chassi" name="vin">
        <Input
          placeholder="Chassi do veículo"
          {...vinField}
          onBlur={(e) => {
            void vinField.onBlur(e)
            void handleVinBlur(e)
          }}
        />
      </FieldWrapper>
      <FieldWrapper label="Cor" name="color">
        <Input placeholder="Ex: Prata" {...register('color')} />
      </FieldWrapper>
      <FieldWrapper label="Combustível" name="fuelType">
        {(id) => (
          <Controller
            name="fuelType"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value ?? '')}
                onValueChange={field.onChange}
                items={FUEL_TYPE_OPTIONS}
              >
                <SelectTrigger id={id}>
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
        )}
      </FieldWrapper>
      <FieldWrapper label="Uso do Veículo" name="vehicleUsage">
        {(id) => (
          <Controller
            name="vehicleUsage"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value ?? '')}
                onValueChange={field.onChange}
                items={VEHICLE_USAGE_OPTIONS}
              >
                <SelectTrigger id={id}>
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
        )}
      </FieldWrapper>
    </>
  )
}
