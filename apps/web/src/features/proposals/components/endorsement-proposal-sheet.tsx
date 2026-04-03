'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as zod from 'zod'

import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/shared/form-field'

import { useCreateProposal } from '@/features/proposals/hooks/use-proposals'
import {
  POLICY_BRANCH_LABELS,
  type PolicyBranch,
} from '@/features/policies/lib/constants'
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

interface EndorsementProposalSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly policyId: string
  readonly policyNumber: string
  readonly clientName?: string | null
  readonly branch: PolicyBranch
}

export function EndorsementProposalSheet({
  open,
  onOpenChange,
  policyId,
  policyNumber,
  clientName,
  branch,
}: EndorsementProposalSheetProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Criar Endosso</SheetTitle>
          <SheetDescription>
            Crie uma proposta de endosso vinculada a esta apólice. O registro
            histórico continua na aba Registros de Endosso.
          </SheetDescription>
        </SheetHeader>

        <div className="bg-muted/20 border-border mt-6 space-y-3 rounded-lg border px-4 py-3">
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
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mt-6 space-y-4 px-6"
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
                    <SelectValue placeholder="Selecione o tipo de endosso" />
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

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createProposal.isPending}>
              {createProposal.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Criar Endosso
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
