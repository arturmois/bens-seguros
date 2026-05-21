'use client'

import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import type { ComparisonMetric, DashboardPreset } from '../../lib/constants'

interface NewInsuranceCardProps {
  readonly data: ComparisonMetric | undefined
  readonly isLoading: boolean
  readonly preset: DashboardPreset
}

const PRESET_TO_DAYS: Record<DashboardPreset, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 180,
}

function buildHref(preset: DashboardPreset): string {
  const days = PRESET_TO_DAYS[preset]
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const params = new URLSearchParams({
    boardType: 'NEW_INSURANCE',
    createdFrom: from,
  })
  return `/policies?${params.toString()}`
}

export function NewInsuranceCard({
  data,
  isLoading,
  preset,
}: NewInsuranceCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="new-insurance-card-loading">
        <CardPanel className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        </CardPanel>
      </Card>
    )
  }
  const current = data?.current ?? 0
  const hasHistory = data !== undefined && data.previous > 0
  const isPositive = (data?.changePercent ?? 0) >= 0
  return (
    <Card>
      <Link
        href={buildHref(preset)}
        className="focus-visible:outline-primary block rounded-xl focus-visible:outline-2"
        aria-label={`${current} seguros novos, ver lista`}
      >
        <CardPanel className="flex items-center gap-4">
          <div className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-sm">
              Seguro Novo
            </p>
            <p className="truncate text-2xl font-semibold tracking-tight">
              {current}
            </p>
            {hasHistory && data ? (
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="text-success size-3" />
                ) : (
                  <TrendingDown className="text-destructive size-3" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    isPositive ? 'text-success' : 'text-destructive'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {data.changePercent}%
                </span>
                <span className="text-muted-foreground text-xs">
                  vs anterior
                </span>
              </div>
            ) : null}
          </div>
        </CardPanel>
      </Link>
    </Card>
  )
}
