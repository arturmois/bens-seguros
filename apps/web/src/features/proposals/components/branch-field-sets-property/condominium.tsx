'use client'

import { useWatch } from 'react-hook-form'

import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'
import { Input } from '@/components/ui/input'

import type { FieldHelperProps } from '../branch-field-sets'
import { FieldWrapper } from '../branch-field-sets'
import { AutoFilledBadge, EquipmentToggle, type AutoFillData } from './shared'

interface CondominiumFieldsProps extends FieldHelperProps {
  autoFill?: AutoFillData
}

export function CondominiumFields({
  register,
  control,
  setValue,
  autoFill,
}: CondominiumFieldsProps) {
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
      <AddressFieldsWithCep
        control={control}
        register={register}
        setValue={setValue}
        required={{ cep: true }}
      />
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
