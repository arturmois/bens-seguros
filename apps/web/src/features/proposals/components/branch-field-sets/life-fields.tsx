'use client'

import {
  Controller,
  useWatch,
  type Control,
  type FieldValues,
} from 'react-hook-form'

import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { FieldWrapper } from './field-wrapper'
import type { FieldHelperProps } from './types'

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
    color: 'text-info bg-info/10',
  },
  {
    max: BMI_NORMAL_THRESHOLD,
    label: 'Normal',
    color:
      'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950' /* INTENCIONAL — estado de saúde normal, não estado semântico de sucesso */,
  },
  {
    max: BMI_OVERWEIGHT_THRESHOLD,
    label: 'Sobrepeso',
    color:
      'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950' /* INTENCIONAL — estado de saúde intermediário, sem token equivalente */,
  },
  {
    max: Infinity,
    label: 'Obesidade',
    color: 'text-destructive bg-destructive/10',
  },
] as const

function BmiBadge({ control }: { readonly control: Control<FieldValues> }) {
  const height = useWatch({ control, name: 'heightInCentimeters' })
  const peso = useWatch({ control, name: 'weightKg' })
  const heightCm = Number(height)
  const weightKg = Number(peso)
  if (
    !heightCm ||
    !weightKg ||
    heightCm < HEIGHT_MIN_CM ||
    heightCm > HEIGHT_MAX_CM ||
    weightKg < WEIGHT_MIN_KG ||
    weightKg > WEIGHT_MAX_KG
  ) {
    return null
  }
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
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
      <FieldWrapper label="Profissão" name="occupation" required>
        <Input
          placeholder="Profissão do segurado"
          {...register('occupation')}
        />
      </FieldWrapper>
      <FieldWrapper label="Renda Mensal" name="monthlyIncomeCents">
        {(id) => (
          <Controller
            name="monthlyIncomeCents"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                id={id}
                value={field.value ?? 0}
                onChange={field.onChange}
              />
            )}
          />
        )}
      </FieldWrapper>
      <FieldWrapper label="Fumante" name="isSmoker">
        {(id) => (
          <Controller
            name="isSmoker"
            control={control}
            render={({ field }) => (
              <Switch
                id={id}
                checked={field.value === true}
                onCheckedChange={field.onChange}
              />
            )}
          />
        )}
      </FieldWrapper>
      <FieldWrapper label="Esportes Radicais" name="extremeSports">
        {(id) => (
          <Controller
            name="extremeSports"
            control={control}
            render={({ field }) => (
              <Switch
                id={id}
                checked={field.value === true}
                onCheckedChange={field.onChange}
              />
            )}
          />
        )}
      </FieldWrapper>
      <FieldWrapper label="Altura (cm)" name="heightInCentimeters">
        <Input
          type="number"
          placeholder="175"
          {...register('heightInCentimeters', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Peso (kg)" name="weightKg">
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
      <FieldWrapper label="Beneficiários" name="beneficiaries">
        <Textarea
          placeholder="Nomes e parentesco dos beneficiários"
          {...register('beneficiaries')}
        />
      </FieldWrapper>
    </>
  )
}
