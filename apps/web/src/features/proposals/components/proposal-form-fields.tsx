import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import type { z } from 'zod'

import { FormField } from '@/components/shared/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { CreateProposalBody } from '@/api/endpoints/proposals/proposals.zod'
import { ContactSearch } from '@/features/contacts/components/contact-search'

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
  readonly onCreateContact?: () => void
}

export function ProposalFormFields({
  control,
  boardType,
  branchOptions,
  boardTypeOptions,
  onCreateContact,
}: ProposalFormFieldsProps) {
  return (
    <>
      <Controller
        control={control}
        name="contactId"
        render={({ field, fieldState }) => (
          <FormField
            label="Contato"
            required
            error={fieldState.error?.message}
            span="full"
          >
            <ContactSearch
              value={field.value ?? ''}
              onChange={field.onChange}
              onCreateClick={onCreateContact}
            />
          </FormField>
        )}
      />
      <Controller
        control={control}
        name="branch"
        render={({ field, fieldState }) => (
          <FormField label="Ramo" required error={fieldState.error?.message}>
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
          </FormField>
        )}
      />
      <Controller
        control={control}
        name="boardType"
        render={({ field, fieldState }) => (
          <FormField label="Tipo" required error={fieldState.error?.message}>
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
          </FormField>
        )}
      />
      {boardType === 'RENEWAL' && (
        <Controller
          control={control}
          name="renewalPolicyNumber"
          render={({ field, fieldState }) => (
            <FormField
              label="Nº da apólice anterior"
              error={fieldState.error?.message}
              span="full"
            >
              <RenewalPolicyInput
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            </FormField>
          )}
        />
      )}
    </>
  )
}
