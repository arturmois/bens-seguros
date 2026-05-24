'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { useIssuePolicy } from '@/features/policies/hooks/use-policies'

import { InsurerField } from './insurer-field'
import {
  EMPTY_VALUES,
  formatDateToISO,
  issuePolicyFormSchema,
  parseDateString,
  type IssuePolicyFormValues,
} from './types'

const FORM_ID = 'issue-policy-form'

interface IssuePolicyDialogProps {
  readonly proposalId: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function IssuePolicyDialog({
  proposalId,
  open,
  onOpenChange,
}: IssuePolicyDialogProps) {
  const issuePolicy = useIssuePolicy()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Emitir apólice</DialogTitle>
          <DialogDescription>
            Preencha os dados para emitir a apólice vinculada a esta proposta.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {open && (
            <IssuePolicyFormBody
              proposalId={proposalId}
              mutation={issuePolicy}
              onSubmitted={() => onOpenChange(false)}
            />
          )}
        </DialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={issuePolicy.isPending}>
            {issuePolicy.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Emitir apólice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface IssuePolicyFormBodyProps {
  readonly proposalId: string
  readonly mutation: ReturnType<typeof useIssuePolicy>
  readonly onSubmitted: () => void
}

function IssuePolicyFormBody({
  proposalId,
  mutation,
  onSubmitted,
}: IssuePolicyFormBodyProps) {
  const router = useRouter()
  const form = useForm<IssuePolicyFormValues>({
    resolver: zodResolver(issuePolicyFormSchema),
    defaultValues: EMPTY_VALUES,
  })
  function handleSubmit(values: IssuePolicyFormValues) {
    mutation.mutate(
      { proposalId, ...values },
      {
        onSuccess: (policy) => {
          onSubmitted()
          router.push(`/policies/${policy.id}`)
        },
      }
    )
  }
  return (
    <form
      id={FORM_ID}
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-4"
    >
      <FormField
        label="Número da Apólice"
        error={form.formState.errors.policyNumber?.message}
        required
      >
        <Input
          placeholder="Ex: AUTO-2026-001"
          {...form.register('policyNumber')}
        />
      </FormField>
      <InsurerField
        control={form.control}
        setValue={form.setValue}
        error={form.formState.errors.insurerId?.message}
      />
      <FormField
        label="Início da Vigência"
        error={form.formState.errors.startDate?.message}
        required
      >
        <Controller
          name="startDate"
          control={form.control}
          render={({ field }) => (
            <DatePicker
              value={parseDateString(field.value)}
              onChange={(date) => field.onChange(formatDateToISO(date))}
            />
          )}
        />
      </FormField>
      <FormField
        label="Fim da Vigência"
        error={form.formState.errors.endDate?.message}
        required
      >
        <Controller
          name="endDate"
          control={form.control}
          render={({ field }) => (
            <DatePicker
              value={parseDateString(field.value)}
              onChange={(date) => field.onChange(formatDateToISO(date))}
            />
          )}
        />
      </FormField>
    </form>
  )
}
