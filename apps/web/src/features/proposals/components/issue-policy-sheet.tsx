'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { IssuePolicyBody } from '@/api/endpoints/policies/policies.zod'
import { useListInsurers } from '@/api/endpoints/insurers/insurers'
import { FormField } from '@/components/shared/form-field'
import { useIssuePolicy } from '@/features/policies/hooks/use-policies'

const issuePolicyFormSchema = IssuePolicyBody.omit({
  proposalId: true,
  coverageDetails: true,
}).extend({
  insurerId: z.string().min(1, 'Selecione uma seguradora'),
})

type IssuePolicyFormValues = z.infer<typeof issuePolicyFormSchema>

const EMPTY_VALUES: IssuePolicyFormValues = {
  policyNumber: '',
  startDate: '',
  endDate: '',
  insurerId: '',
}

interface IssuePolicySheetProps {
  readonly proposalId: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  return date.toISOString()
}

export function IssuePolicySheet({
  proposalId,
  open,
  onOpenChange,
}: IssuePolicySheetProps) {
  const router = useRouter()
  const issuePolicy = useIssuePolicy()
  const { data: insurersResponse } = useListInsurers({ active: true })
  const insurers = insurersResponse?.data.data ?? []

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Emitir Apólice</SheetTitle>
          <SheetDescription>
            Preencha os dados para emitir a apólice vinculada a esta proposta.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mt-6 space-y-4 px-6"
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

          <FormField
            label="Seguradora"
            error={form.formState.errors.insurerId?.message}
            required
          >
            <Controller
              name="insurerId"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a seguradora" />
                  </SelectTrigger>
                  <SelectContent>
                    {insurers.map((insurer) => (
                      <SelectItem key={insurer.id} value={insurer.id}>
                        {insurer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

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

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={issuePolicy.isPending}>
              {issuePolicy.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Emitir Apólice
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
