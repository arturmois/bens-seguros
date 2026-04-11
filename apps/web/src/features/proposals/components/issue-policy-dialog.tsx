'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useListInsurers } from '@/api/endpoints/insurers/insurers'
import { IssuePolicyBody } from '@/api/endpoints/policies/policies.zod'
import type { ListInsurers200DataItem } from '@/api/model'
import { FormField } from '@/components/shared/form-field'
import { InsurerFormDialog } from '@/features/insurers/components/insurer-form-dialog'
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

interface IssuePolicyDialogProps {
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

export function IssuePolicyDialog({
  proposalId,
  open,
  onOpenChange,
}: IssuePolicyDialogProps) {
  const router = useRouter()
  const issuePolicy = useIssuePolicy()
  const {
    data: insurersResponse,
    isLoading: insurersLoading,
    isError: insurersError,
  } = useListInsurers({ active: true })
  const [insurerDialogOpen, setInsurerDialogOpen] = useState(false)
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
    if (!open) {
      setInsurerDialogOpen(false)
      setCreatedInsurer(null)
      return
    }

    form.reset(EMPTY_VALUES)
    setCreatedInsurer(null)
  }, [open, form])

  function handleInsurerCreated(insurer: ListInsurers200DataItem) {
    setCreatedInsurer(insurer)
    form.setValue('insurerId', insurer.id, { shouldValidate: true })
    setInsurerDialogOpen(false)
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
    <>
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

              <FormField
                label="Seguradora"
                error={form.formState.errors.insurerId?.message}
                required
              >
                {!insurersLoading &&
                !insurersError &&
                visibleInsurers.length === 0 ? (
                  <div className="border-border bg-muted/20 space-y-3 rounded-lg border border-dashed p-4">
                    <div>
                      <p className="font-medium">
                        Nenhuma seguradora ativa cadastrada
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Cadastre uma seguradora para concluir a emissão da
                        apólice.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInsurerDialogOpen(true)}
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
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
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
                        onClick={() => setInsurerDialogOpen(true)}
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

      <InsurerFormDialog
        open={insurerDialogOpen}
        onOpenChange={setInsurerDialogOpen}
        onSuccess={handleInsurerCreated}
      />
    </>
  )
}
