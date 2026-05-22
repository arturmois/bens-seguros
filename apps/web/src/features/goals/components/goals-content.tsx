'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardPanel } from '@/components/ui/card'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { hasPermission } from '@/lib/permissions'

import { useGoalsProgress } from '../hooks/use-goals-progress'
import { useUpsertGoals } from '../hooks/use-upsert-goals'
import type { GoalProgressEntry } from '../lib/constants'
import { getDefaultYear } from '../lib/constants'
import { GoalsFillFromAnnualDialog } from './goals-fill-from-annual-dialog'
import type { GoalsFormRow } from './goals-form'
import { GoalsForm } from './goals-form'
import { GoalsYearSelector } from './goals-year-selector'

function buildInitialRows(
  entries: readonly GoalProgressEntry[]
): readonly GoalsFormRow[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const newEntry = entries.find(
      (e) => e.month === month && e.boardType === 'NEW_INSURANCE'
    )
    const renEntry = entries.find(
      (e) => e.month === month && e.boardType === 'RENEWAL'
    )
    return {
      newInsuranceCents: newEntry?.targetPremiumCents ?? 0,
      renewalCents: renEntry?.targetPremiumCents ?? 0,
    }
  })
}

const EMPTY_ROWS: readonly GoalsFormRow[] = Array.from({ length: 12 }, () => ({
  newInsuranceCents: 0,
  renewalCents: 0,
}))

export function GoalsContent() {
  const [year, setYear] = useState<number>(getDefaultYear())
  const [fillOpen, setFillOpen] = useState(false)
  const [rows, setRows] = useState<readonly GoalsFormRow[]>(EMPTY_ROWS)
  const { activeOrg } = useOrgs()
  const canEdit = activeOrg
    ? hasPermission(activeOrg.role, 'goals:update')
    : false

  const { data, isLoading, isError, refetch } = useGoalsProgress(year)
  const upsert = useUpsertGoals({ year })

  useEffect(() => {
    if (data?.entries) {
      setRows(buildInitialRows(data.entries))
    }
  }, [data?.entries])

  if (isLoading) {
    return (
      <Card>
        <CardPanel className="flex h-64 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </CardPanel>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardPanel className="flex flex-col items-center justify-center gap-3 py-16">
          <AlertTriangle className="text-destructive size-8" />
          <p className="text-muted-foreground text-sm">
            Erro ao carregar metas.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </CardPanel>
      </Card>
    )
  }

  const isEmpty = rows.every(
    (r) => r.newInsuranceCents === 0 && r.renewalCents === 0
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <GoalsYearSelector year={year} onYearChange={setYear} />
      </div>
      {isEmpty && canEdit && (
        <p className="text-muted-foreground text-sm">
          Sem metas cadastradas para {year}. Preencha abaixo.
        </p>
      )}
      <Card>
        <CardPanel>
          <GoalsForm
            year={year}
            rows={rows}
            canEdit={canEdit}
            onRowChange={(index, patch) =>
              setRows((prev) =>
                prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
              )
            }
            onSubmit={(flat) =>
              upsert.mutate({ year, data: { entries: [...flat] } })
            }
            onOpenFillDialog={() => setFillOpen(true)}
            isSaving={upsert.isPending}
          />
        </CardPanel>
      </Card>
      <GoalsFillFromAnnualDialog
        open={fillOpen}
        onOpenChange={setFillOpen}
        onApply={(newMonths, renMonths) => {
          setRows(
            Array.from({ length: 12 }, (_, i) => ({
              newInsuranceCents: newMonths[i] ?? 0,
              renewalCents: renMonths[i] ?? 0,
            }))
          )
        }}
      />
    </div>
  )
}
