'use client'

import { RefreshCw } from 'lucide-react'
import Link from 'next/link'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/formatters'

interface Renewal7dCardProps {
  readonly count: number | undefined
  readonly premiumCents: number | undefined
  readonly isLoading: boolean
}

export function Renewal7dCard({
  count,
  premiumCents,
  isLoading,
}: Renewal7dCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="renewal-7d-card-loading">
        <CardPanel className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </CardPanel>
      </Card>
    )
  }
  const safeCount = count ?? 0
  const safePremium = premiumCents ?? 0
  return (
    <Card>
      <Link
        href="/policies?filter=expiring-7d"
        className="focus-visible:outline-primary block rounded-xl focus-visible:outline-2"
        aria-label={`${safeCount} renovações nos próximos 7 dias, ver lista`}
      >
        <CardPanel className="flex items-center gap-4">
          <div className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <RefreshCw className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-sm">
              Renovação 7 dias
            </p>
            <p className="truncate text-2xl font-semibold tracking-tight">
              {safeCount}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {formatCurrency(safePremium)} em prêmio
            </p>
          </div>
        </CardPanel>
      </Link>
    </Card>
  )
}
