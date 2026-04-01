'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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

import { CreateProposalBody } from '@/api/endpoints/proposals/proposals.zod'
import { useCreateProposal } from '../hooks/use-proposals'
import {
  BOARD_TYPE_LABELS,
  BOARD_TYPES,
  BRANCH_LABELS,
  BRANCHES,
} from '../lib/constants'
import { ClientSearch } from './client-search'
import { PolicySearch } from './policy-search'

type ProposalFormValues = z.infer<typeof CreateProposalBody>

const BRANCH_OPTIONS = BRANCHES.map((b) => ({
  value: b,
  label: BRANCH_LABELS[b],
}))
const BOARD_TYPE_OPTIONS = BOARD_TYPES.map((bt) => ({
  value: bt,
  label: BOARD_TYPE_LABELS[bt],
}))

interface ProposalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProposalForm({ open, onOpenChange }: ProposalFormProps) {
  const createMutation = useCreateProposal()

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(CreateProposalBody),
    mode: 'onBlur',
    defaultValues: {
      clientId: '',
    },
  })

  const boardType = form.watch('boardType')

  const handleSubmit = (values: ProposalFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        form.reset()
        onOpenChange(false)
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Nova Proposta</SheetTitle>
          <SheetDescription>
            Preencha os dados para criar uma nova proposta.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4 px-6 pt-4"
        >
          <Controller
            control={form.control}
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
            control={form.control}
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
                  items={BRANCH_OPTIONS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ramo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCH_OPTIONS.map((opt) => (
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
            control={form.control}
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
                  items={BOARD_TYPE_OPTIONS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_TYPE_OPTIONS.map((opt) => (
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
              control={form.control}
              name="renewalPolicyId"
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label>Apólice sendo renovada</Label>
                  <PolicySearch
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

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {createMutation.isPending ? 'Criando...' : 'Criar Proposta'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
