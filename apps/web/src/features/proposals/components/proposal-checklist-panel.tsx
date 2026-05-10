'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'

import { useChecklist, useCompleteChecklistItem } from '../hooks/use-checklist'
import type { ChecklistItem } from '../lib/constants'

interface ProposalChecklistPanelProps {
  proposalId: string
}

interface ChecklistItemRowProps {
  item: ChecklistItem
  onComplete: (id: string) => void
  isPending: boolean
}

function ChecklistItemRow({
  item,
  onComplete,
  isPending,
}: ChecklistItemRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Checkbox
        id={item.id}
        checked={item.isCompleted}
        disabled={item.isCompleted || isPending}
        onCheckedChange={() => {
          if (!item.isCompleted) onComplete(item.id)
        }}
        className="mt-0.5"
      />
      <label
        htmlFor={item.id}
        className={`flex flex-1 items-center gap-2 text-sm leading-tight ${item.isCompleted ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <span
          className={
            item.isCompleted ? 'text-muted-foreground line-through' : ''
          }
        >
          {item.label}
        </span>
        {item.isRequired && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            Obrigatório
          </Badge>
        )}
      </label>
    </div>
  )
}

export function ProposalChecklistPanel({
  proposalId,
}: ProposalChecklistPanelProps) {
  const { data, isLoading, isError } = useChecklist(proposalId)
  const completeMutation = useCompleteChecklistItem(proposalId)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="text-muted-foreground h-5 w-5" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <p className="text-destructive py-4 text-sm">
        Erro ao carregar checklist.
      </p>
    )
  }
  const { items, summary } = data
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        <span>Nenhum item de checklist para esta proposta.</span>
      </div>
    )
  }
  const progressValue =
    summary.required > 0
      ? Math.round((summary.requiredCompleted / summary.required) * 100)
      : 100
  const requiredItems = items.filter((item) => item.isRequired)
  const optionalItems = items.filter((item) => !item.isRequired)
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {summary.requiredCompleted} de {summary.required} obrigatórios
            completos
          </span>
          <span className="font-medium tabular-nums">{progressValue}%</span>
        </div>
        <Progress value={progressValue} max={100}>
          <ProgressTrack>
            <ProgressIndicator
              className={progressValue === 100 ? 'bg-success' : undefined}
            />
          </ProgressTrack>
        </Progress>
      </div>
      {!summary.canAdvance && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Itens pendentes impedem o avanço de estágio.
          </p>
        </div>
      )}
      {requiredItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Obrigatórios
          </p>
          <div className="divide-y">
            {requiredItems.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onComplete={completeMutation.mutate}
                isPending={completeMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}
      {optionalItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Opcionais
          </p>
          <div className="divide-y">
            {optionalItems.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onComplete={completeMutation.mutate}
                isPending={completeMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
