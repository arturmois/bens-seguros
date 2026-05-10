'use client'

import { Clock, MessageSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { useClaimOccurrences } from '../hooks/use-claims'

const OCCURRENCE_TYPE_LABELS: Record<string, string> = {
  acompanhamento: 'Acompanhamento',
  comunicado: 'Comunicado',
  documento_solicitado: 'Documento Solicitado',
  vistoria: 'Vistoria',
  parecer: 'Parecer',
  outro: 'Outro',
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(dateStr))
}

interface OccurrenceListProps {
  readonly claimId: string
}

export function OccurrenceList({ claimId }: OccurrenceListProps) {
  const { data, isLoading, isError, refetch } = useClaimOccurrences(claimId)
  if (isLoading) {
    return <OccurrenceListSkeleton />
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-destructive text-sm">
          Erro ao carregar ocorrências.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <MessageSquare className="text-muted-foreground size-10" />
        <p className="text-muted-foreground text-sm">
          Nenhuma ocorrência registrada
        </p>
      </div>
    )
  }
  const sorted = [...data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return (
    <div className="relative space-y-0">
      <div className="bg-border absolute left-4 top-0 h-full w-px" />
      {sorted.map((occurrence) => (
        <div key={occurrence.id} className="relative flex gap-4 pb-6">
          <div className="bg-background relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
            <Clock className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">
                {OCCURRENCE_TYPE_LABELS[occurrence.type] ?? occurrence.type}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(occurrence.createdAt)}
              </span>
              {(occurrence.createdByName ?? occurrence.createdBy) && (
                <span className="text-muted-foreground text-xs">
                  por {occurrence.createdByName ?? occurrence.createdBy}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm">{occurrence.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function OccurrenceListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={`occ-skel-${String(i)}`} className="flex gap-4">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
