'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useUpdateProposalDetails } from '../../../hooks/use-proposals'
import { BRANCH_LABELS } from '../../../lib/constants'
import type { InsuredObjectDetails, ProposalData } from '../../../lib/constants'
import { BranchFields } from '../../branch-fields'

interface EditInsuredObjectDialogProps {
  readonly proposal: ProposalData
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

const FORM_ID = 'edit-insured-object-form'

export function EditInsuredObjectDialog({
  proposal,
  open,
  onOpenChange,
}: EditInsuredObjectDialogProps) {
  const [isDirty, setIsDirty] = useState(false)
  const updateMutation = useUpdateProposalDetails()

  function handleSubmit(data: {
    details: InsuredObjectDetails
    premiumValueInCents: number
    commissionBasisPoints: number
  }) {
    updateMutation.mutate(
      {
        id: proposal.id,
        details: data.details,
        premiumValueInCents: data.premiumValueInCents,
        commissionBasisPoints: data.commissionBasisPoints,
      },
      {
        onSuccess: () => {
          setIsDirty(false)
          onOpenChange(false)
        },
      }
    )
  }

  function handleCancel() {
    if (isDirty) {
      const confirmed = window.confirm(
        'Descartar alterações? Os campos não salvos serão perdidos.'
      )
      if (!confirmed) return
    }
    setIsDirty(false)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true)
          return
        }
        handleCancel()
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Bem Segurado</DialogTitle>
          <DialogDescription>
            {BRANCH_LABELS[proposal.branch]} · atualize os dados do objeto
            segurado e os valores.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <BranchFields
            branch={proposal.branch}
            defaultValues={proposal.details}
            defaultPremium={proposal.premiumValueInCents}
            defaultCommission={proposal.commissionPercentageInCents}
            autoFill={{
              clientName: proposal.clientName,
              clientDocument: proposal.clientDocument,
              clientPersonType: proposal.clientPersonType,
            }}
            proposalId={proposal.id}
            onSubmit={handleSubmit}
            isLoading={updateMutation.isPending}
            hideSubmit
            formId={FORM_ID}
            onDirtyChange={setIsDirty}
          />
        </div>
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          {isDirty ? (
            <span className="text-xs font-semibold text-amber-600">
              ● alterações não salvas
            </span>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              )}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
