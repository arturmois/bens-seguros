'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface WarningsData {
  readonly total: number
  readonly claimsOpen: number
  readonly assistancesOpen: number
}

interface WarningsCardProps {
  readonly data: WarningsData | undefined
  readonly isLoading: boolean
}

export function WarningsCard({ data, isLoading }: WarningsCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="warnings-card-loading">
        <CardPanel className="flex items-start gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-32" />
          </div>
        </CardPanel>
      </Card>
    )
  }
  const total = data?.total ?? 0
  const claimsOpen = data?.claimsOpen ?? 0
  const assistancesOpen = data?.assistancesOpen ?? 0
  const noneOpen = claimsOpen === 0 && assistancesOpen === 0
  return (
    <Card>
      <CardPanel className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-sm">Avisos</p>
          <p className="truncate text-2xl font-semibold tracking-tight">
            {total}
          </p>
          <div className="mt-1 flex flex-col gap-0.5 text-xs">
            {claimsOpen > 0 ? (
              <Link
                href="/claims?statusGroup=open"
                className="text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                aria-label={`${claimsOpen} sinistros abertos, ver lista`}
              >
                {claimsOpen} sinistros
              </Link>
            ) : null}
            {assistancesOpen > 0 ? (
              <Link
                href="/assistances?statusGroup=open"
                className="text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                aria-label={`${assistancesOpen} assistências abertas, ver lista`}
              >
                {assistancesOpen} assistências
              </Link>
            ) : null}
            {noneOpen ? (
              <span className="text-muted-foreground">
                Nenhum aviso em aberto
              </span>
            ) : null}
          </div>
        </div>
      </CardPanel>
    </Card>
  )
}
