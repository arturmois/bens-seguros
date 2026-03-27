'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import type React from 'react'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import type { ComparisonMetric } from '../types'

interface ComparisonStatCardProps {
  readonly title: string
  readonly value: string | number
  readonly icon: React.ReactNode
  readonly comparison?: ComparisonMetric
  readonly isLoading?: boolean
}

export function ComparisonStatCard({
  title,
  value,
  icon,
  comparison,
  isLoading,
}: ComparisonStatCardProps) {
  if (isLoading) {
    return (
      <Card>
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

  const isPositive = comparison ? comparison.changePercent >= 0 : true
  const showComparison = comparison && comparison.previous > 0

  return (
    <Card>
      <CardPanel className="flex items-center gap-4">
        <div className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {showComparison ? (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="size-3 text-emerald-500" />
              ) : (
                <TrendingDown className="size-3 text-red-500" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  isPositive ? 'text-emerald-500' : 'text-red-500'
                )}
              >
                {isPositive ? '+' : ''}
                {comparison.changePercent}%
              </span>
              <span className="text-muted-foreground text-xs">vs anterior</span>
            </div>
          ) : null}
        </div>
      </CardPanel>
    </Card>
  )
}
