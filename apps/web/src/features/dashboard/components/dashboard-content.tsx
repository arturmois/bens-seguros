'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Card, CardPanel } from '@/components/ui/card'

import { useDashboardStats } from '../hooks/use-dashboard-stats'
import type { DashboardPreset } from '../types'
import { ConversionRate } from './conversion-rate'
import { DashboardPeriodFilter } from './dashboard-period-filter'
import { FinancialMetrics } from './financial-metrics'
import { StatsCards } from './stats-cards'

function ChartSkeleton() {
  return (
    <Card>
      <CardPanel className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </CardPanel>
    </Card>
  )
}

const ProposalsByStage = dynamic(
  () => import('./proposals-by-stage').then((m) => m.ProposalsByStage),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const CommissionsSummary = dynamic(
  () => import('./commissions-summary').then((m) => m.CommissionsSummary),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const ClaimsByPriority = dynamic(
  () => import('./claims-by-priority').then((m) => m.ClaimsByPriority),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const AlertsWidget = dynamic(
  () => import('./alerts-widget').then((m) => m.AlertsWidget),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const TrendChart = dynamic(
  () => import('./trend-chart').then((m) => m.TrendChart),
  { loading: () => <ChartSkeleton />, ssr: false }
)

export function DashboardContent() {
  const [preset, setPreset] = useState<DashboardPreset>('30d')
  const { data, isLoading, isError, refetch } = useDashboardStats(preset)

  if (isError) {
    return (
      <Card>
        <CardPanel className="flex flex-col items-center justify-center gap-3 py-16">
          <AlertTriangle className="text-destructive size-8" />
          <p className="text-muted-foreground text-sm">
            Erro ao carregar dados do dashboard.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </CardPanel>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <DashboardPeriodFilter preset={preset} onPresetChange={setPreset} />
      </div>
      <StatsCards data={data} isLoading={isLoading} />
      <FinancialMetrics data={data} isLoading={isLoading} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProposalsByStage data={data?.proposalsByStage} isLoading={isLoading} />
        <CommissionsSummary
          data={data?.commissionsThisMonth}
          isLoading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ConversionRate data={data?.conversionRate} isLoading={isLoading} />
        <ClaimsByPriority data={data?.claimsByPriority} isLoading={isLoading} />
        <AlertsWidget />
      </div>
      <TrendChart data={data?.monthlyTrends} isLoading={isLoading} />
    </div>
  )
}
