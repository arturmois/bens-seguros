'use client'

import { TrendingUp } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import type { ConversionRate as ConversionRateType } from '../lib/constants'

interface ConversionRateProps {
  data: ConversionRateType | undefined
  isLoading: boolean
}

export function ConversionRate({ data, isLoading }: ConversionRateProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Taxa de conversão</CardTitle>
        </CardHeader>
        <CardPanel>
          <Skeleton className="h-24 w-full" />
        </CardPanel>
      </Card>
    )
  }
  if (!data) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Taxa de conversão</CardTitle>
      </CardHeader>
      <CardPanel className="flex items-center gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">
            {data.rate}%
          </span>
        </div>
        <div className="text-muted-foreground space-y-1 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="text-success size-3.5" />
            <span>{data.issued} convertidas</span>
          </div>
          <p>{data.total} propostas (6 meses)</p>
        </div>
      </CardPanel>
    </Card>
  )
}
