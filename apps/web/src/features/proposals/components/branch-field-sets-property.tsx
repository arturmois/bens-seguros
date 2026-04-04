'use client'

import type { UseFormRegister } from 'react-hook-form'
import { Controller, useWatch, type Control } from 'react-hook-form'
import { InputMask } from '@react-input/mask'

import { Checkbox } from '@/components/ui/checkbox'
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

export interface AutoFillData {
  clientName?: string
  clientDocument?: string
  clientPersonType?: string
}

interface PropertyFieldHelperProps extends FieldHelperProps {
  autoFill?: AutoFillData
}

function stripToDigits(s: string): string {
  return s.replace(/\D/g, '')
}

function AutoFilledBadge({
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

interface EquipmentToggleProps {
  name: string
  detailsName: string
  label: string
  placeholder: string
  control: Control
  register: UseFormRegister<Record<string, unknown>>
}

function EquipmentToggle({
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

export function CondominiumFields({
  register,
  control,
  autoFill,
}: PropertyFieldHelperProps) {
  const isCompanyClient = autoFill?.clientPersonType === 'COMPANY'
  const condominiumNameValue = useWatch({ control, name: 'condominiumName' })

  return (
    <>
      <FieldWrapper label="Nome do Condomínio" required>
        <Input
          placeholder="Nome do condomínio"
          {...register('condominiumName')}
        />
        {isCompanyClient && (
          <AutoFilledBadge
            value={String(condominiumNameValue ?? '')}
            originalValue={autoFill?.clientName ?? ''}
          />
        )}
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
      <FieldWrapper label="Quantidade de Blocos">
        <Input
          type="number"
          placeholder="Ex: 4"
          {...register('blockCount', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Quantidade de Elevadores">
        <Input
          type="number"
          placeholder="Ex: 2"
          {...register('elevatorCount', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Número de Funcionários">
        <Input
          type="number"
          placeholder="Ex: 10"
          {...register('employeeCount', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <EquipmentToggle
        name="hasSecurityEquipment"
        detailsName="securityEquipmentDetails"
        label="Possui equipamentos de segurança?"
        placeholder="Ex: Câmeras, portaria 24h, alarme"
        control={control}
        register={register}
      />
      <EquipmentToggle
        name="hasFireEquipment"
        detailsName="fireEquipmentDetails"
        label="Possui equipamentos de incêndio?"
        placeholder="Ex: Sprinklers, extintores, hidrantes"
        control={control}
        register={register}
      />
    </>
  )
}

export function BusinessFields({
  register,
  control,
  autoFill,
}: PropertyFieldHelperProps) {
  const isCompanyClient = autoFill?.clientPersonType === 'COMPANY'
  const legalNameValue = useWatch({ control, name: 'legalName' })

  return (
    <>
      <FieldWrapper label="Razão Social" required>
        <Input
          placeholder="Razão social da empresa"
          {...register('legalName')}
        />
        {isCompanyClient && (
          <AutoFilledBadge
            value={String(legalNameValue ?? '')}
            originalValue={autoFill?.clientName ?? ''}
          />
        )}
      </FieldWrapper>
      <FieldWrapper label="CNPJ" required>
        <Controller
          name="cnpj"
          control={control}
          render={({ field }) => (
            <>
              <InputMask
                component={Input}
                mask={CNPJ_MASK.mask}
                replacement={CNPJ_MASK.replacement}
                placeholder="00.000.000/0000-00"
                {...field}
                value={String(field.value ?? '')}
              />
              {isCompanyClient && (
                <AutoFilledBadge
                  value={String(field.value ?? '')}
                  originalValue={autoFill?.clientDocument ?? ''}
                />
              )}
            </>
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
