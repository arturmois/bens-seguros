'use client'

import { Banknote, Receipt, TrendingUp } from 'lucide-react'

import { formatCurrency } from '@/lib/formatters'

import type { DashboardStats } from '../types'
import { ComparisonStatCard } from './comparison-stat-card'

interface FinancialMetricsProps {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
}

export function FinancialMetrics({ data, isLoading }: FinancialMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <ComparisonStatCard
        title="Prêmio total emitido"
        value={data ? formatCurrency(data.totalPremium.current) : '—'}
        icon={<Banknote className="size-5" />}
        comparison={data?.totalPremium}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Ticket médio"
        value={data ? formatCurrency(data.averageTicket.current) : '—'}
        icon={<TrendingUp className="size-5" />}
        comparison={data?.averageTicket}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Comissões a receber"
        value={data ? formatCurrency(data.commissionsReceivable) : '—'}
        icon={<Receipt className="size-5" />}
        isLoading={isLoading}
      />
    </div>
  )
}
