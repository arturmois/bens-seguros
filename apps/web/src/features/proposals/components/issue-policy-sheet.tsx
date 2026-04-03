'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
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
import type { ListInsurers200DataItem } from '@/api/model'
import { FormField } from '@/components/shared/form-field'
import { useIssuePolicy } from '@/features/policies/hooks/use-policies'
import { InsurerFormSheet } from '@/features/insurers/components/insurer-form-sheet'

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
  const date = new Date(value)
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
  const [insurerSheetOpen, setInsurerSheetOpen] = useState(false)
  const [createdInsurer, setCreatedInsurer] =
    useState<ListInsurers200DataItem | null>(null)
  const insurers = insurersResponse?.data.data ?? []
  const visibleInsurers = useMemo(() => {
    if (!createdInsurer) return insurers
    if (insurers.some((insurer) => insurer.id === createdInsurer.id)) {
      return insurers
    }
    return [createdInsurer, ...insurers]
  }, [createdInsurer, insurers])

  const form = useForm<IssuePolicyFormValues>({
    resolver: zodResolver(issuePolicyFormSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(EMPTY_VALUES)
    setCreatedInsurer(null)
  }, [open, form])

  function handleInsurerCreated(insurer: ListInsurers200DataItem) {
    setCreatedInsurer(insurer)
    form.setValue('insurerId', insurer.id, { shouldValidate: true })
    setInsurerSheetOpen(false)
  }

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
            {visibleInsurers.length === 0 ? (
              <div className="border-border bg-muted/20 space-y-3 rounded-lg border border-dashed p-4">
                <div>
                  <p className="font-medium">
                    Nenhuma seguradora ativa cadastrada
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Cadastre uma seguradora para concluir a emissão da apólice.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInsurerSheetOpen(true)}
                >
                  <Plus className="mr-2 size-4" />
                  Cadastrar seguradora
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Controller
                  name="insurerId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a seguradora">
                          {(value: string | null) => {
                            const item = visibleInsurers.find(
                              (insurer) => insurer.id === value
                            )
                            return item?.name ?? null
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {visibleInsurers.map((insurer) => (
                          <SelectItem key={insurer.id} value={insurer.id}>
                            {insurer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInsurerSheetOpen(true)}
                  >
                    <Plus className="mr-2 size-4" />
                    Nova seguradora
                  </Button>
                </div>
              </div>
            )}
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

        <InsurerFormSheet
          open={insurerSheetOpen}
          onOpenChange={setInsurerSheetOpen}
          onSuccess={handleInsurerCreated}
        />
      </SheetContent>
    </Sheet>
  )
}
