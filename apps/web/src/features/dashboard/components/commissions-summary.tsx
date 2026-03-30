'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { Card, CardHeader, CardTitle, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/formatters'

import type { CommissionByStatus } from '../lib/constants'

const STATUS_GROUPS: Record<string, { label: string; key: string }> = {
  PENDING_COMMERCIAL: { label: 'Pendente Comercial', key: 'pending' },
  PENDING_ADMIN: { label: 'Pendente Admin', key: 'pending' },
  APPROVED: { label: 'Aprovadas', key: 'approved' },
  PAID: { label: 'Pagas', key: 'paid' },
}

interface CommissionsSummaryProps {
  data: CommissionByStatus[] | undefined
  isLoading: boolean
}

export function CommissionsSummary({
  data,
  isLoading,
}: CommissionsSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Comissões do mês</CardTitle>
        </CardHeader>
        <CardPanel>
          <Skeleton className="h-64 w-full" />
        </CardPanel>
      </Card>
    )
  }

  const grouped = {
    pending: 0,
    approved: 0,
    paid: 0,
  }

  for (const item of data ?? []) {
    const group = STATUS_GROUPS[item.status]
    if (group) {
      const key = group.key as keyof typeof grouped
      grouped[key] += item._sum.commissionValueInCents ?? 0
    }
  }

  const chartData = [
    { name: 'Pendentes', value: grouped.pending / 100 },
    { name: 'Aprovadas', value: grouped.approved / 100 },
    { name: 'Pagas', value: grouped.paid / 100 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Comissões do mês</CardTitle>
      </CardHeader>
      <CardPanel>
        <ResponsiveContainer width="100%" height={256}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              tickFormatter={(v: number) => formatCurrency(v * 100)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-card)',
                fontSize: '0.875rem',
              }}
              formatter={(value) => [
                formatCurrency(Number(value) * 100),
                'Valor',
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            <Bar
              dataKey="value"
              name="Valor"
              fill="var(--color-success)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardPanel>
    </Card>
  )
}
