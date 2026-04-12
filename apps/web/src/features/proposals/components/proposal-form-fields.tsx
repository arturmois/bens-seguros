import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import type { z } from 'zod'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { CreateProposalBody } from '@/api/endpoints/proposals/proposals.zod'
import { ClientSearch } from './client-search'
import { RenewalPolicyInput } from './renewal-policy-input'

type ProposalFormValues = z.infer<typeof CreateProposalBody>

interface SelectOption {
  readonly value: string
  readonly label: string
}

interface ProposalFormFieldsProps {
  readonly control: Control<ProposalFormValues>
  readonly boardType: string | undefined
  readonly branchOptions: readonly SelectOption[]
  readonly boardTypeOptions: readonly SelectOption[]
}

export function ProposalFormFields({
  control,
  boardType,
  branchOptions,
  boardTypeOptions,
}: ProposalFormFieldsProps) {
  return (
    <>
      <Controller
        control={control}
        name="clientId"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label>
              Cliente
              <span className="text-destructive ml-1">*</span>
            </Label>
            <ClientSearch value={field.value} onChange={field.onChange} />
            {fieldState.error?.message ? (
              <p className="text-destructive text-sm">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )}
      />

      <Controller
        control={control}
        name="branch"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label>
              Ramo
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Select
              value={field.value ?? ''}
              onValueChange={field.onChange}
              items={branchOptions}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ramo">
                  {(value: string) =>
                    branchOptions.find((opt) => opt.value === value)?.label ??
                    null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.error?.message ? (
              <p className="text-destructive text-sm">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )}
      />

      <Controller
        control={control}
        name="boardType"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label>
              Tipo
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Select
              value={field.value ?? ''}
              onValueChange={field.onChange}
              items={boardTypeOptions}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo">
                  {(value: string) =>
                    boardTypeOptions.find((opt) => opt.value === value)
                      ?.label ?? null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {boardTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.error?.message ? (
              <p className="text-destructive text-sm">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )}
      />

      {boardType === 'RENEWAL' && (
        <Controller
          control={control}
          name="renewalPolicyNumber"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label>Nº da apólice anterior</Label>
              <RenewalPolicyInput
                value={field.value ?? ''}
                onChange={field.onChange}
              />
              {fieldState.error?.message ? (
                <p className="text-destructive text-sm">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />
      )}
    </>
  )
}
