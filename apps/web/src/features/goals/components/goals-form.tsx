'use client'

import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { MONTH_LABELS } from '../lib/constants'

export interface GoalsFormRow {
  readonly newInsuranceCents: number
  readonly renewalCents: number
}

export interface GoalsFormSubmitEntry {
  readonly month: number
  readonly boardType: 'NEW_INSURANCE' | 'RENEWAL'
  readonly targetPremiumCents: number
}

interface GoalsFormProps {
  readonly year: number
  readonly rows: readonly GoalsFormRow[]
  readonly canEdit: boolean
  readonly onRowChange: (index: number, patch: Partial<GoalsFormRow>) => void
  readonly onSubmit: (entries: ReadonlyArray<GoalsFormSubmitEntry>) => void
  readonly onOpenFillDialog: () => void
  readonly isSaving?: boolean
}

export function GoalsForm({
  year,
  rows,
  canEdit,
  onRowChange,
  onSubmit,
  onOpenFillDialog,
  isSaving,
}: GoalsFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const flat: GoalsFormSubmitEntry[] = []
    rows.forEach((row, i) => {
      const month = i + 1
      flat.push({
        month,
        boardType: 'NEW_INSURANCE',
        targetPremiumCents: row.newInsuranceCents,
      })
      flat.push({
        month,
        boardType: 'RENEWAL',
        targetPremiumCents: row.renewalCents,
      })
    })
    onSubmit(flat)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mês</TableHead>
            <TableHead>Seguro Novo</TableHead>
            <TableHead>Renovação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={MONTH_LABELS[i]}>
              <TableCell className="font-medium">{MONTH_LABELS[i]}</TableCell>
              <TableCell>
                <div
                  aria-label={`Meta de Seguro Novo de ${MONTH_LABELS[i]} de ${year}`}
                >
                  <CurrencyInput
                    value={row.newInsuranceCents}
                    onChange={(cents) =>
                      onRowChange(i, { newInsuranceCents: cents })
                    }
                    disabled={!canEdit}
                  />
                </div>
              </TableCell>
              <TableCell>
                <div
                  aria-label={`Meta de Renovação de ${MONTH_LABELS[i]} de ${year}`}
                >
                  <CurrencyInput
                    value={row.renewalCents}
                    onChange={(cents) =>
                      onRowChange(i, { renewalCents: cents })
                    }
                    disabled={!canEdit}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {canEdit && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onOpenFillDialog}>
            Preencher pelo valor anual
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Salvando…' : 'Salvar metas'}
          </Button>
        </div>
      )}
    </form>
  )
}
