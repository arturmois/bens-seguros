'use client'

import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type { InsuranceBranch, InsuredObjectDetails } from '../lib/constants'
import {
  buildAutoFillDefaults,
  buildDetails,
} from '../lib/build-branch-details'
import {
  AutoFields,
  FieldWrapper,
  LifeFields,
  OtherFields,
} from './branch-field-sets'
import type { FieldHelperProps } from './branch-field-sets'
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
  readonly onSubmit: (data: {
    details: InsuredObjectDetails
    premiumValueInCents: number
    commissionBasisPoints: number
  }) => void
  readonly isLoading?: boolean
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

export function BranchFields({
  branch,
  defaultValues,
  defaultPremium,
  defaultCommission,
  autoFill,
  onSubmit,
  isLoading,
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

  const form = useForm<FieldValues>({ defaultValues: formDefaults })

  function handleFormSubmit(values: FieldValues) {
    const { premiumValueInCents, commissionBasisPoints, ...rest } = values
    const details: InsuredObjectDetails = buildDetails(branch, rest)
    onSubmit({
      details,
      premiumValueInCents: Number(premiumValueInCents) || 0,
      commissionBasisPoints: Number(commissionBasisPoints) || 0,
    })
  }

  const BranchComponent = BRANCH_FIELD_MAP[branch]

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <BranchComponent
          register={form.register}
          control={form.control}
          autoFill={autoFill}
        />
      </div>

      <div className="border-border border-t pt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrapper
            label="Valor do Prêmio"
            required
            hint="Em centavos (ex: 150000 = R$ 1.500,00)"
          >
            <Input
              type="number"
              placeholder="150000"
              {...form.register('premiumValueInCents', { valueAsNumber: true })}
            />
          </FieldWrapper>
          <FieldWrapper
            label="Comissão (%)"
            required
            hint="Em pontos base (ex: 1500 = 15%)"
          >
            <Input
              type="number"
              placeholder="1500"
              {...form.register('commissionBasisPoints', {
                valueAsNumber: true,
              })}
            />
          </FieldWrapper>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar dados do objeto segurado
        </Button>
      </div>
    </form>
  )
}
