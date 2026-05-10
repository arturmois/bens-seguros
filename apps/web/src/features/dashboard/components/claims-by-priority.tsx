'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { Card, CardHeader, CardTitle, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import type { ClaimByPriority } from '../lib/constants'

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  NORMAL: { label: 'Normal', color: 'var(--color-info)' },
  HIGH: { label: 'Alta', color: 'var(--color-warning)' },
  URGENT: { label: 'Urgente', color: 'var(--color-destructive)' },
}

interface ClaimsByPriorityProps {
  data: ClaimByPriority[] | undefined
  isLoading: boolean
}

export function ClaimsByPriority({ data, isLoading }: ClaimsByPriorityProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sinistros por prioridade</CardTitle>
        </CardHeader>
        <CardPanel>
          <Skeleton className="h-48 w-full" />
        </CardPanel>
      </Card>
    )
  }
  const chartData = (data ?? []).map((d) => ({
    name: PRIORITY_CONFIG[d.priority]?.label ?? d.priority,
    value: d._count,
    color: PRIORITY_CONFIG[d.priority]?.color ?? 'var(--color-muted)',
  }))
  const total = chartData.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sinistros por prioridade</CardTitle>
        </CardHeader>
        <CardPanel className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Nenhum sinistro aberto
          </p>
        </CardPanel>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Sinistros por prioridade</CardTitle>
      </CardHeader>
      <CardPanel>
        <ResponsiveContainer width="100%" height={192}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-card)',
                fontSize: '0.875rem',
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '0.75rem' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardPanel>
    </Card>
  )
}
