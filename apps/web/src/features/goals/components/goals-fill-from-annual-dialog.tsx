'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import { splitAnnualToMonths } from '../lib/format'

interface GoalsFillFromAnnualDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onApply: (
    newInsuranceMonths: readonly number[],
    renewalMonths: readonly number[]
  ) => void
}

export function GoalsFillFromAnnualDialog({
  open,
  onOpenChange,
  onApply,
}: GoalsFillFromAnnualDialogProps) {
  const [annualNewCents, setAnnualNewCents] = useState(0)
  const [annualRenewalCents, setAnnualRenewalCents] = useState(0)

  function handleApply() {
    onApply(
      splitAnnualToMonths(annualNewCents),
      splitAnnualToMonths(annualRenewalCents)
    )
    setAnnualNewCents(0)
    setAnnualRenewalCents(0)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preencher pelo valor anual</DialogTitle>
          <DialogDescription>
            Os valores informados serão divididos igualmente entre os 12 meses
            (resto vai pra Dezembro).
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="annual-new">Meta anual — Seguro Novo</Label>
              <CurrencyInput
                id="annual-new"
                value={annualNewCents}
                onChange={setAnnualNewCents}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="annual-renewal">Meta anual — Renovação</Label>
              <CurrencyInput
                id="annual-renewal"
                value={annualRenewalCents}
                onChange={setAnnualRenewalCents}
              />
            </div>
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
