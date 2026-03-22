'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { Card, CardHeader, CardTitle, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import type { ProposalByStage } from '../types'

const STAGE_LABELS: Record<string, string> = {
  CAPTURE: 'Captacao',
  QUOTE: 'Cotacao',
  PROTOCOL: 'Protocolo',
  INSPECTION: 'Vistoria',
  PAYMENT: 'Pagamento',
}

const STAGE_ORDER = ['CAPTURE', 'QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT']

interface ProposalsByStageProps {
  data: ProposalByStage[] | undefined
  isLoading: boolean
}

export function ProposalsByStage({ data, isLoading }: ProposalsByStageProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Propostas por estagio</CardTitle>
        </CardHeader>
        <CardPanel>
          <Skeleton className="h-64 w-full" />
        </CardPanel>
      </Card>
    )
  }

  const chartData = STAGE_ORDER.map((stage) => ({
    stage: STAGE_LABELS[stage] ?? stage,
    count: data?.find((d) => d.stage === stage)?._count ?? 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Propostas por estagio</CardTitle>
      </CardHeader>
      <CardPanel>
        <ResponsiveContainer width="100%" height={256}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="stage"
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
            <Bar
              dataKey="count"
              name="Propostas"
              fill="var(--color-primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardPanel>
    </Card>
  )
}
