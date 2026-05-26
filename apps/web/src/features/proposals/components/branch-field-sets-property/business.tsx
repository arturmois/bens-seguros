'use client'

import { InputMask } from '@react-input/mask'
import { Controller, useWatch } from 'react-hook-form'

import { isBusinessSegment, shouldShowAreaM2 } from '@repo/shared'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'
import { CNPJ_MASK, sanitizeDocumentForMask } from '@/lib/masks'

import {
  BUSINESS_SEGMENT_LABELS,
  BUSINESS_SEGMENT_OPTIONS,
} from '../../lib/business-segment'
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
  const businessSegmentRaw = useWatch({ control, name: 'businessSegment' })
  const businessSegment = isBusinessSegment(businessSegmentRaw)
    ? businessSegmentRaw
    : null
  const showAreaField = shouldShowAreaM2(businessSegment)

  return (
    <>
      <FieldWrapper label="Razão Social" name="legalName" required>
        {(id) => (
          <>
            <Input
              id={id}
              placeholder="Razão social da empresa"
              {...register('legalName')}
            />
            {isCompanyClient && (
              <AutoFilledBadge
                value={String(legalNameValue ?? '')}
                originalValue={autoFill?.clientName ?? ''}
              />
            )}
          </>
        )}
      </FieldWrapper>
      <FieldWrapper label="CNPJ" name="cnpj" required>
        {(id) => (
          <Controller
            name="cnpj"
            control={control}
            render={({ field }) => (
              <>
                <InputMask
                  id={id}
                  component={Input}
                  mask={CNPJ_MASK.mask}
                  replacement={CNPJ_MASK.replacement}
                  placeholder="00.000.000/0000-00"
                  {...field}
                  value={sanitizeDocumentForMask(field.value)}
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
        )}
      </FieldWrapper>
      <FieldWrapper label="Atividade" name="businessActivity" required>
        <Input
          placeholder="Atividade principal"
          {...register('businessActivity')}
        />
      </FieldWrapper>
      <FieldWrapper label="Segmento empresarial" name="businessSegment">
        {(id) => (
          <Controller
            name="businessSegment"
            control={control}
            render={({ field }) => {
              const currentSegment = isBusinessSegment(field.value)
                ? field.value
                : null
              return (
                <Select
                  value={currentSegment ?? ''}
                  onValueChange={(value) => {
                    const nextSegment = isBusinessSegment(value) ? value : null
                    field.onChange(nextSegment)
                    if (!shouldShowAreaM2(nextSegment)) {
                      setValue('areaM2', undefined)
                    }
                  }}
                  items={BUSINESS_SEGMENT_OPTIONS}
                >
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Selecione o segmento">
                      {(value: string | null) =>
                        isBusinessSegment(value)
                          ? BUSINESS_SEGMENT_LABELS[value]
                          : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_SEGMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }}
          />
        )}
      </FieldWrapper>
      <AddressFieldsWithCep
        control={control}
        register={register}
        setValue={setValue}
        required={{ cep: false }}
      />
      {showAreaField && (
        <FieldWrapper label="Área (m²)" name="areaM2">
          <Input
            type="number"
            placeholder="Ex: 200"
            {...register('areaM2', { valueAsNumber: true })}
          />
        </FieldWrapper>
      )}
    </>
  )
}
