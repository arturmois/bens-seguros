'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import type { FieldValues } from 'react-hook-form'
import { Controller, FormProvider, useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { PercentageInput } from '@/components/ui/percentage-input'

import { getFormSchemaFor } from '../lib/branch-form-schemas'
import {
  buildAutoFillDefaults,
  buildDetails,
} from '../lib/build-branch-details'
import type { InsuranceBranch, InsuredObjectDetails } from '../lib/constants'
import type { FieldHelperProps } from './branch-field-sets'
import {
  AutoFields,
  FieldWrapper,
  LifeFields,
  OtherFields,
} from './branch-field-sets'
import type { AutoFillData } from './branch-field-sets-property'
import {
  BusinessFields,
  CondominiumFields,
  ResidentialFields,
} from './branch-field-sets-property'

interface BranchFieldsProps {
  readonly branch: InsuranceBranch
  readonly defaultValues?: InsuredObjectDetails | null
  readonly defaultPremium?: number
  readonly defaultCommission?: number
  readonly autoFill?: AutoFillData
  readonly proposalId?: string
  readonly onSubmit: (data: {
    details: InsuredObjectDetails
    premiumValueInCents: number
    commissionBasisPoints: number
  }) => void
  readonly isLoading?: boolean
  readonly hideSubmit?: boolean
  readonly formId?: string
  readonly onDirtyChange?: (isDirty: boolean) => void
}

type BranchComponent =
  | React.FC<FieldHelperProps>
  | React.FC<FieldHelperProps & { autoFill?: AutoFillData }>

const BRANCH_FIELD_MAP: Record<InsuranceBranch, BranchComponent> = {
  AUTO: AutoFields,
  RESIDENTIAL: ResidentialFields,
  CONDOMINIUM: CondominiumFields,
  BUSINESS: BusinessFields,
  LIFE: LifeFields,
  OTHER: OtherFields,
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'number' && Number.isNaN(value)) return true
  return false
}

function hasRealChange(
  initial: Record<string, unknown>,
  current: Record<string, unknown>
): boolean {
  const keys = new Set([...Object.keys(initial), ...Object.keys(current)])
  for (const key of keys) {
    const initVal = initial[key]
    const curVal = current[key]
    const initEmpty = isEmptyValue(initVal)
    const curEmpty = isEmptyValue(curVal)
    if (initEmpty && curEmpty) continue
    if (initVal !== curVal) return true
  }
  return false
}

export function BranchFields({
  branch,
  defaultValues,
  defaultPremium,
  defaultCommission,
  autoFill,
  proposalId,
  onSubmit,
  isLoading,
  hideSubmit,
  formId,
  onDirtyChange,
}: BranchFieldsProps) {
  const rawDefaults = defaultValues ?? {}
  const baseDefaults: Record<string, unknown> = {
    ...rawDefaults,
    premiumValueInCents: defaultPremium ?? 0,
    commissionBasisPoints: defaultCommission ?? 0,
  }
  if (
    'branch' in rawDefaults &&
    rawDefaults.branch === 'LIFE' &&
    'weightInGrams' in rawDefaults &&
    typeof rawDefaults.weightInGrams === 'number' &&
    rawDefaults.weightInGrams > 0
  ) {
    baseDefaults.weightKg = rawDefaults.weightInGrams / 1000
  }
  const formDefaults = buildAutoFillDefaults(branch, autoFill, baseDefaults)
  const form = useForm<FieldValues>({
    defaultValues: formDefaults,
    resolver: zodResolver(getFormSchemaFor(branch)),
    mode: 'onBlur',
  })
  const watchedValues = form.watch()
  const isDirty = useMemo(
    () => hasRealChange(formDefaults, watchedValues),
    [formDefaults, watchedValues]
  )
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])
  function handleFormSubmit(values: FieldValues) {
    const { premiumValueInCents, commissionBasisPoints, ...rest } = values
    const details: InsuredObjectDetails = buildDetails(branch, rest)
    onSubmit({
      details,
      premiumValueInCents: premiumValueInCents ?? 0,
      commissionBasisPoints: commissionBasisPoints ?? 0,
    })
  }
  const BranchComponent = BRANCH_FIELD_MAP[branch]
  return (
    <FormProvider {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <BranchComponent
            register={form.register}
            control={form.control}
            setValue={form.setValue}
            getValues={form.getValues}
            proposalId={proposalId}
            autoFill={autoFill}
          />
        </div>
        <div className="space-y-3">
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            Valores
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWrapper
              label="Valor do Prêmio"
              name="premiumValueInCents"
              required
            >
              <Controller
                name="premiumValueInCents"
                control={form.control}
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </FieldWrapper>
            <FieldWrapper
              label="Comissão"
              name="commissionBasisPoints"
              required
            >
              <Controller
                name="commissionBasisPoints"
                control={form.control}
                render={({ field }) => (
                  <PercentageInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </FieldWrapper>
          </div>
        </div>
        {!hideSubmit && (
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar dados do objeto segurado
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}
