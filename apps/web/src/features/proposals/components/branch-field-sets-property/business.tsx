'use client'

import { Controller, useWatch } from 'react-hook-form'
import { InputMask } from '@react-input/mask'

import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'
import { Input } from '@/components/ui/input'
import { CNPJ_MASK } from '@/lib/masks'

import type { FieldHelperProps } from '../branch-field-sets'
import { FieldWrapper } from '../branch-field-sets'
import { AutoFilledBadge, type AutoFillData } from './shared'

interface BusinessFieldsProps extends FieldHelperProps {
  autoFill?: AutoFillData
}

export function BusinessFields({
  register,
  control,
  setValue,
  autoFill,
}: BusinessFieldsProps) {
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
      <AddressFieldsWithCep
        control={control}
        register={register}
        setValue={setValue}
        required={{ cep: false }}
      />
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
