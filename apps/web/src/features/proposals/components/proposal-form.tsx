'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import type { z } from 'zod'

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

import { CreateProposalBody } from '@/api/endpoints/proposals/proposals.zod'
import { useCreateProposal } from '../hooks/use-proposals'
import {
  BOARD_TYPE_LABELS,
  BOARD_TYPES,
  BRANCH_LABELS,
  BRANCHES,
} from '../lib/constants'
import { ProposalFormFields } from './proposal-form-fields'

type ProposalFormValues = z.infer<typeof CreateProposalBody>

const BRANCH_OPTIONS = BRANCHES.map((b) => ({
  value: b,
  label: BRANCH_LABELS[b],
}))
// ENDORSEMENT proposals are created via EndorsementProposalDialog (from policy detail)
const BOARD_TYPE_OPTIONS = BOARD_TYPES.filter((bt) => bt !== 'ENDORSEMENT').map(
  (bt) => ({
    value: bt,
    label: BOARD_TYPE_LABELS[bt],
  })
)

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova proposta</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova proposta.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <form
            id="proposal-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <ProposalFormFields
              control={form.control}
              boardType={boardType}
              branchOptions={BRANCH_OPTIONS}
              boardTypeOptions={BOARD_TYPE_OPTIONS}
            />
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
            form="proposal-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Criar proposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
