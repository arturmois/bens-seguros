'use client'

import type { Control, FieldValues, UseFormRegister } from 'react-hook-form'
import { Controller, useWatch } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { FUEL_TYPE_OPTIONS, VEHICLE_USAGE_OPTIONS } from '../lib/branch-options'

export interface FieldHelperProps {
  register: UseFormRegister<FieldValues>
  control: Control<FieldValues>
}

interface FormFieldProps {
  readonly label: string
  readonly required?: boolean
  readonly hint?: string
  readonly children: React.ReactNode
}

export function FieldWrapper({
  label,
  required,
  hint,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  )
}

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
                <SelectValue placeholder="Selecione" />
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
                <SelectValue placeholder="Selecione" />
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

// WHO BMI classification thresholds (https://www.who.int/data/gho/data/themes/theme-details/GHO/body-mass-index)
const BMI_UNDERWEIGHT_THRESHOLD = 18.5
const BMI_NORMAL_THRESHOLD = 25
const BMI_OVERWEIGHT_THRESHOLD = 30

const HEIGHT_MIN_CM = 100
const HEIGHT_MAX_CM = 250
const WEIGHT_MIN_KG = 20
const WEIGHT_MAX_KG = 300
const BMI_RANGES = [
  {
    max: BMI_UNDERWEIGHT_THRESHOLD,
    label: 'Abaixo do peso',
    color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
  },
  {
    max: BMI_NORMAL_THRESHOLD,
    label: 'Normal',
    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
  },
  {
    max: BMI_OVERWEIGHT_THRESHOLD,
    label: 'Sobrepeso',
    color:
      'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950',
  },
  {
    max: Infinity,
    label: 'Obesidade',
    color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
  },
] as const

function BmiBadge({ control }: { readonly control: Control<FieldValues> }) {
  const height = useWatch({ control, name: 'heightInCentimeters' })
  const peso = useWatch({ control, name: 'weightKg' })

  const heightCm = Number(height)
  const pesoKg = Number(peso)

  if (
    !heightCm ||
    !pesoKg ||
    heightCm < HEIGHT_MIN_CM ||
    heightCm > HEIGHT_MAX_CM ||
    pesoKg < WEIGHT_MIN_KG ||
    pesoKg > WEIGHT_MAX_KG
  ) {
    return null
  }

  const heightM = heightCm / 100
  const bmi = pesoKg / (heightM * heightM)
  const range = BMI_RANGES.find((r) => bmi < r.max)

  if (!range) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${range.color}`}
    >
      IMC: {bmi.toFixed(1)} — {range.label}
    </div>
  )
}

export function LifeFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Profissão" required>
        <Input
          placeholder="Profissão do segurado"
          {...register('occupation')}
        />
      </FieldWrapper>
      <FieldWrapper label="Renda Mensal (centavos)">
        <Input
          type="number"
          placeholder="Ex: 500000 = R$ 5.000"
          {...register('monthlyIncomeCents', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Fumante">
        <Controller
          name="isSmoker"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value === true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Esportes Radicais">
        <Controller
          name="extremeSports"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value === true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Altura (cm)">
        <Input
          type="number"
          placeholder="175"
          {...register('heightInCentimeters', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Peso (kg)">
        <Input
          type="number"
          step="0.1"
          placeholder="70.5"
          {...register('weightKg', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <div className="sm:col-span-2">
        <BmiBadge control={control} />
      </div>
      <FieldWrapper label="Beneficiários">
        <Textarea
          placeholder="Nomes e parentesco dos beneficiários"
          {...register('beneficiaries')}
        />
      </FieldWrapper>
    </>
  )
}

export function OtherFields({ register }: FieldHelperProps) {
  return (
    <FieldWrapper label="Descrição" required>
      <Textarea
        placeholder="Descreva o objeto segurado"
        {...register('description')}
      />
    </FieldWrapper>
  )
}
