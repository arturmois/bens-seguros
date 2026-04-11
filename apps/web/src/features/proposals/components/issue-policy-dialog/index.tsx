'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
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
  const router = useRouter()
  const issuePolicy = useIssuePolicy()

  const form = useForm<IssuePolicyFormValues>({
    resolver: zodResolver(issuePolicyFormSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(EMPTY_VALUES)
  }, [open, form])

  function handleSubmit(values: IssuePolicyFormValues) {
    issuePolicy.mutate(
      { proposalId, ...values },
      {
        onSuccess: (policy) => {
          onOpenChange(false)
          router.push(`/policies/${policy.id}`)
        },
      }
    )
  }

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
          <form
            id="issue-policy-form"
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
              dialogOpen={open}
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
                    placeholder="Selecione a data de início"
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
                    placeholder="Selecione a data de fim"
                  />
                )}
              />
            </FormField>
          </form>
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="issue-policy-form"
            disabled={issuePolicy.isPending}
          >
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
