'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { Card, CardHeader, CardTitle, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import type { MonthlyTrend } from '../types'

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
}

function formatMonth(month: string): string {
  const parts = month.split('-')
  return MONTH_LABELS[parts[1] ?? ''] ?? month
}

interface TrendChartProps {
  data: MonthlyTrend[] | undefined
  isLoading: boolean
}

export function TrendChart({ data, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tendencia (6 meses)</CardTitle>
        </CardHeader>
        <CardPanel>
          <Skeleton className="h-64 w-full" />
        </CardPanel>
      </Card>
    )
  }

  const chartData = (data ?? []).map((d) => ({
    month: formatMonth(d.month),
    proposals: Number(d.proposals),
    issued: Number(d.issued),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Tendencia (6 meses)</CardTitle>
      </CardHeader>
      <CardPanel>
        <ResponsiveContainer width="100%" height={256}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-card)',
                fontSize: '0.875rem',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            <Line
              type="monotone"
              dataKey="proposals"
              name="Propostas"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="issued"
              name="Convertidas"
              stroke="var(--color-success)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardPanel>
    </Card>
  )
}
