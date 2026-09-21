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

import {
  useChecklist,
  useCompleteChecklistItem,
  useUncompleteChecklistItem,
} from '../hooks/use-checklist'
import type { ChecklistItem } from '../lib/constants'

interface ProposalChecklistPanelProps {
  proposalId: string
}

interface ChecklistItemRowProps {
  item: ChecklistItem
  onToggle: (item: ChecklistItem) => void
  isPending: boolean
}

function ChecklistItemRow({
  item,
  onToggle,
  isPending,
}: ChecklistItemRowProps) {
  const isAutoCompleted = item.isCompleted && item.completedBy === null
  return (
    <div className="flex items-start gap-3 py-2">
      <Checkbox
        id={item.id}
        checked={item.isCompleted}
        disabled={isPending}
        onCheckedChange={() => onToggle(item)}
        className="mt-0.5"
      />
      <label
        htmlFor={item.id}
        className="flex flex-1 cursor-pointer items-center gap-2 text-sm leading-tight"
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
        {isAutoCompleted && (
          <Badge
            variant="secondary"
            className="shrink-0 text-xs"
            title="Marcado automaticamente pelo sistema — desmarque se quiser sinalizar revisão"
          >
            Auto-atendido
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
  const uncompleteMutation = useUncompleteChecklistItem(proposalId)
  const isPending = completeMutation.isPending || uncompleteMutation.isPending
  function handleToggle(item: ChecklistItem) {
    if (item.isCompleted) {
      uncompleteMutation.mutate(item.id)
    } else {
      completeMutation.mutate(item.id)
    }
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <p className="py-4 text-destructive text-sm">
        Erro ao carregar checklist.
      </p>
    )
  }
  const { items, summary } = data
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
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
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-warning-foreground">
            Itens pendentes impedem o avanço de estágio.
          </p>
        </div>
      )}
      {requiredItems.length > 0 && (
        <div className="space-y-1">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            Obrigatórios
          </p>
          <div className="divide-y">
            {requiredItems.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}
      {optionalItems.length > 0 && (
        <div className="space-y-1">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            Opcionais
          </p>
          <div className="divide-y">
            {optionalItems.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
