'use client'

import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import Link from 'next/link'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGoalsProgress } from '@/features/goals/hooks/use-goals-progress'
import {
  BOARD_TYPE_KEYS,
  BOARD_TYPE_LABEL,
  getDefaultYear,
  MONTH_LABELS,
  type GoalBoardType,
} from '@/features/goals/lib/constants'
import { formatCurrency } from '@/lib/formatters'

function GoalsCardShell({
  year,
  toolbar,
  children,
}: {
  year: number
  toolbar?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Metas {year}</CardTitle>
        {toolbar}
      </CardHeader>
      {children}
    </Card>
  )
}

export function GoalsProgressCard() {
  const currentYear = getDefaultYear()
  const [boardType, setBoardType] = useState<GoalBoardType>('NEW_INSURANCE')
  const { data, isLoading, isError, refetch } = useGoalsProgress(currentYear)

  if (isLoading) {
    return (
      <GoalsCardShell year={currentYear}>
        <CardPanel>
          <Skeleton className="h-64 w-full" />
        </CardPanel>
      </GoalsCardShell>
    )
  }

  if (isError) {
    return (
      <GoalsCardShell year={currentYear}>
        <CardPanel className="flex flex-col items-center justify-center gap-3 py-16">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-muted-foreground text-sm">
            Erro ao carregar metas comerciais.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </CardPanel>
      </GoalsCardShell>
    )
  }

  const isEmpty = (data?.entries ?? []).every((e) => e.targetPremiumCents === 0)

  if (isEmpty) {
    return (
      <GoalsCardShell year={currentYear}>
        <CardPanel className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-muted-foreground text-sm">
            Sem metas para {currentYear}.
          </p>
          <Link
            href="/metas"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Cadastrar metas
          </Link>
        </CardPanel>
      </GoalsCardShell>
    )
  }

  const filteredEntries = (data?.entries ?? []).filter(
    (e) => e.boardType === boardType
  )
  // Recharts requires numeric values; convert cents to reais for axis math
  // and convert back to cents in tooltip/axis formatters before `formatCurrency`.
  const chartData = filteredEntries.map((e) => ({
    month: (MONTH_LABELS[e.month - 1] ?? '').slice(0, 3),
    target: e.targetPremiumCents / 100,
    realized: e.realizedPremiumCents / 100,
  }))

  const toolbar = (
    <div className="flex gap-1" role="group" aria-label="Tipo de meta">
      {BOARD_TYPE_KEYS.map((type) => (
        <Button
          key={type}
          variant={boardType === type ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          aria-pressed={boardType === type}
          onClick={() => {
            setBoardType(type)
          }}
        >
          {BOARD_TYPE_LABEL[type]}
        </Button>
      ))}
    </div>
  )

  return (
    <GoalsCardShell year={currentYear} toolbar={toolbar}>
      <CardPanel>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            aria-label={`Progresso de metas ${BOARD_TYPE_LABEL[boardType]} ${currentYear}`}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'var(--color-foreground)' }}
              stroke="var(--color-border)"
              tickLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--color-foreground)' }}
              tickFormatter={(v: number) => formatCurrency(v * 100)}
              stroke="var(--color-border)"
              tickLine={{ stroke: 'var(--color-border)' }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-card)',
                fontSize: '0.875rem',
              }}
              formatter={(value, name) => [
                formatCurrency(Number(value) * 100),
                name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            <Bar
              dataKey="target"
              name="Meta"
              fill="var(--color-primary)"
              fillOpacity={0.7}
              radius={[4, 4, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="realized"
              name="Realizado"
              stroke="var(--color-success)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardPanel>
    </GoalsCardShell>
  )
}
