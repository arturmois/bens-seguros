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

import { COMBUSTIVEL_OPTIONS, USO_VEICULO_OPTIONS } from '../lib/branch-options'

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
        <Input placeholder="Ex: Volkswagen" {...register('marca')} />
      </FieldWrapper>
      <FieldWrapper label="Modelo" required>
        <Input placeholder="Ex: Gol 1.6" {...register('modelo')} />
      </FieldWrapper>
      <FieldWrapper label="Ano Fabricação" required>
        <Input
          type="number"
          placeholder="Ex: 2024"
          {...register('anoFabricacao', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Ano Modelo" required>
        <Input
          type="number"
          placeholder="Ex: 2025"
          {...register('anoModelo', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Placa">
        <Input placeholder="Ex: ABC1D23" {...register('placa')} />
      </FieldWrapper>
      <FieldWrapper label="Chassi">
        <Input placeholder="Chassi do veículo" {...register('chassi')} />
      </FieldWrapper>
      <FieldWrapper label="Cor">
        <Input placeholder="Ex: Prata" {...register('cor')} />
      </FieldWrapper>
      <FieldWrapper label="Combustível">
        <Controller
          name="combustivel"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={COMBUSTIVEL_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {COMBUSTIVEL_OPTIONS.map((opt) => (
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
          name="usoVeiculo"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={USO_VEICULO_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {USO_VEICULO_OPTIONS.map((opt) => (
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

const IMC_RANGES = [
  {
    max: 18.5,
    label: 'Abaixo do peso',
    color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
  },
  {
    max: 25,
    label: 'Normal',
    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
  },
  {
    max: 30,
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

function ImcBadge({ control }: { readonly control: Control<FieldValues> }) {
  const altura = useWatch({ control, name: 'alturaEmCentimetros' })
  const peso = useWatch({ control, name: 'pesoEmGramas' })

  const alturaNum = Number(altura)
  const pesoNum = Number(peso)

  if (
    !alturaNum ||
    !pesoNum ||
    alturaNum < 100 ||
    alturaNum > 250 ||
    pesoNum < 20000 ||
    pesoNum > 300000
  ) {
    return null
  }

  const alturaM = alturaNum / 100
  const pesoKg = pesoNum / 1000
  const imc = pesoKg / (alturaM * alturaM)
  const range = IMC_RANGES.find((r) => imc < r.max)

  if (!range) return null

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${range.color}`}
    >
      IMC: {imc.toFixed(1)} — {range.label}
    </div>
  )
}

export function LifeFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Profissão" required>
        <Input placeholder="Profissão do segurado" {...register('profissao')} />
      </FieldWrapper>
      <FieldWrapper label="Renda Mensal (centavos)">
        <Input
          type="number"
          placeholder="Ex: 500000 = R$ 5.000"
          {...register('rendaMensalCentavos', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Fumante">
        <Controller
          name="fumante"
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
          name="esportesRadicais"
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
          {...register('alturaEmCentimetros', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper
        label="Peso (kg)"
        hint="Em gramas internamente (ex: 70.5 kg = 70500)"
      >
        <Input
          type="number"
          placeholder="70500"
          {...register('pesoEmGramas', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <div className="sm:col-span-2">
        <ImcBadge control={control} />
      </div>
      <FieldWrapper label="Beneficiários">
        <Textarea
          placeholder="Nomes e parentesco dos beneficiários"
          {...register('beneficiarios')}
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
        {...register('descricao')}
      />
    </FieldWrapper>
  )
}
