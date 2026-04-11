'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as zod from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/shared/form-field'

import { useCreateProposal } from '@/features/proposals/hooks/use-proposals'
import { POLICY_BRANCH_LABELS } from '@/features/policies/lib/constants'
import type { PolicyBranch } from '@/features/policies/lib/types'
import { ENDORSEMENT_TYPE_OPTIONS } from '@/features/endorsements/lib/constants'

const endorsementProposalSchema = zod.object({
  boardType: zod.literal('ENDORSEMENT'),
  sourcePolicyId: zod.string().min(1),
  endorsementType: zod.string().min(1, 'Selecione o tipo do endosso'),
  endorsementReason: zod.string().min(1, 'Informe o motivo do endosso'),
})

type EndorsementProposalFormValues = zod.infer<typeof endorsementProposalSchema>

const EMPTY_VALUES: EndorsementProposalFormValues = {
  boardType: 'ENDORSEMENT',
  sourcePolicyId: '',
  endorsementType: '',
  endorsementReason: '',
}

interface EndorsementProposalDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly policyId: string
  readonly policyNumber: string
  readonly clientName?: string | null
  readonly branch: PolicyBranch
}

export function EndorsementProposalDialog({
  open,
  onOpenChange,
  policyId,
  policyNumber,
  clientName,
  branch,
}: EndorsementProposalDialogProps) {
  const router = useRouter()
  const createProposal = useCreateProposal()
  const form = useForm<EndorsementProposalFormValues>({
    resolver: zodResolver(endorsementProposalSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      ...EMPTY_VALUES,
      sourcePolicyId: policyId,
    })
  }, [form, open, policyId])

  function handleSubmit(values: EndorsementProposalFormValues) {
    createProposal.mutate(
      {
        ...values,
        sourcePolicyId: policyId,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          router.push('/endorsements')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar endosso</DialogTitle>
          <DialogDescription>
            Crie uma proposta de endosso vinculada a esta apólice. O registro
            histórico continua na aba Registros de Endosso.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <div className="bg-muted/20 border-border space-y-3 rounded-lg border px-4 py-3">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Apólice de origem
              </p>
              <p className="font-medium">{policyNumber}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  Cliente
                </p>
                <p className="font-medium">
                  {clientName ?? 'Cliente não informado'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  Ramo
                </p>
                <p className="font-medium">{POLICY_BRANCH_LABELS[branch]}</p>
              </div>
            </div>
          </div>

          <form
            id="endorsement-proposal-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-4 space-y-4"
          >
            <FormField
              label="Tipo de Endosso"
              error={form.formState.errors.endorsementType?.message}
              required
            >
              <Controller
                name="endorsementType"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de endosso">
                        {(value: string) =>
                          ENDORSEMENT_TYPE_OPTIONS.find(
                            (opt) => opt.value === value
                          )?.label ?? null
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ENDORSEMENT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label="Motivo"
              error={form.formState.errors.endorsementReason?.message}
              required
            >
              <Textarea
                placeholder="Descreva o que motivou este endosso..."
                rows={4}
                {...form.register('endorsementReason')}
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
            form="endorsement-proposal-form"
            disabled={createProposal.isPending}
          >
            {createProposal.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Criar endosso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
