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
import { CEP_MASK, CNPJ_MASK } from '@/lib/masks'

import {
  CONSTRUCTION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_USAGE_OPTIONS,
} from '../lib/branch-options'
import { FieldWrapper } from './branch-field-sets'
import type { FieldHelperProps } from './branch-field-sets'

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
                <SelectValue placeholder="Selecione" />
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
                <SelectValue placeholder="Selecione" />
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
                <SelectValue placeholder="Selecione" />
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

export function CondominiumFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Nome do Condomínio" required>
        <Input
          placeholder="Nome do condomínio"
          {...register('condominiumName')}
        />
      </FieldWrapper>
      <FieldWrapper label="Número de Unidades" required>
        <Input
          type="number"
          placeholder="Ex: 48"
          {...register('unitCount', { valueAsNumber: true })}
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
      <FieldWrapper label="Ano de Construção">
        <Input
          type="number"
          placeholder="Ex: 2010"
          {...register('constructionYear', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Número de Andares">
        <Input
          type="number"
          placeholder="Ex: 12"
          {...register('floorCount', { valueAsNumber: true })}
        />
      </FieldWrapper>
    </>
  )
}

export function BusinessFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Razão Social" required>
        <Input
          placeholder="Razão social da empresa"
          {...register('legalName')}
        />
      </FieldWrapper>
      <FieldWrapper label="CNPJ" required>
        <Controller
          name="cnpj"
          control={control}
          render={({ field }) => (
            <InputMask
              component={Input}
              mask={CNPJ_MASK.mask}
              replacement={CNPJ_MASK.replacement}
              placeholder="00.000.000/0000-00"
              {...field}
              value={String(field.value ?? '')}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Atividade" required>
        <Input
          placeholder="Atividade principal"
          {...register('businessActivity')}
        />
      </FieldWrapper>
      <FieldWrapper label="CEP">
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
      <FieldWrapper label="Área (m²)">
        <Input
          type="number"
          placeholder="Ex: 200"
          {...register('areaM2', { valueAsNumber: true })}
        />
      </FieldWrapper>
    </>
  )
}
