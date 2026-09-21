'use client'

import { AlertCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/formatters'

import { useBillingAiUsage } from '../hooks/use-billing-ai-usage'

const RANGE_OPTIONS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
] as const

type RangeDays = (typeof RANGE_OPTIONS)[number]['days']

function formatChartDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return day && month ? `${day}/${month}` : iso
}

function microcentsToBrl(microcents: number): string {
  return formatCurrency(microcents / 100)
}

function AiUsageSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso de IA</CardTitle>
        <CardDescription>Carregando estatísticas...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
        <Skeleton className="h-64 w-full rounded-md" />
      </CardContent>
    </Card>
  )
}

function AiUsageError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso de IA</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-muted-foreground text-sm">
            Erro ao carregar uso de IA.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AiUsageEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Sparkles className="size-8 text-muted-foreground" />
      <p className="text-muted-foreground text-sm">
        Sem uso de IA neste período.
      </p>
    </div>
  )
}

function MetricTile({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-semibold text-foreground text-lg tabular-nums">
        {value}
      </p>
    </div>
  )
}

interface AiUsageChartDatum {
  readonly date: string
  readonly displayDate: string
  readonly messages: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly costCents: number
}

function AiUsageTooltipContent({
  active,
  payload,
}: {
  readonly active?: boolean
  readonly payload?: ReadonlyArray<{ readonly payload: AiUsageChartDatum }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]?.payload
  if (!item) return null
  return (
    <div className="rounded-md border bg-card p-3 text-xs shadow-sm">
      <p className="font-medium text-foreground">{item.displayDate}</p>
      <p className="mt-1 text-muted-foreground">
        Mensagens:{' '}
        <span className="text-foreground tabular-nums">{item.messages}</span>
      </p>
      <p className="text-muted-foreground">
        Tokens in:{' '}
        <span className="text-foreground tabular-nums">{item.inputTokens}</span>
      </p>
      <p className="text-muted-foreground">
        Tokens out:{' '}
        <span className="text-foreground tabular-nums">
          {item.outputTokens}
        </span>
      </p>
      <p className="text-muted-foreground">
        Custo:{' '}
        <span className="text-foreground tabular-nums">
          {formatCurrency(item.costCents)}
        </span>
      </p>
    </div>
  )
}

export function AiUsageCard() {
  const [days, setDays] = useState<RangeDays>(30)
  const { data, isLoading, isError, refetch } = useBillingAiUsage({ days })

  if (isLoading) return <AiUsageSkeleton />
  if (isError) return <AiUsageError onRetry={() => refetch()} />

  const series = data?.series ?? []
  const totals = data?.totals
  const hasUsage = series.length > 0 && (totals?.messageCount ?? 0) > 0

  const chartData: AiUsageChartDatum[] = series.map((row) => ({
    date: row.date,
    displayDate: formatChartDate(row.date),
    messages: row.messageCount,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costCents: row.totalCostMicrocents / 100,
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Uso de IA</CardTitle>
            <CardDescription>
              Mensagens, tokens e custo no período.
            </CardDescription>
          </div>
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Período"
          >
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.days}
                variant={option.days === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(option.days)}
                aria-pressed={option.days === days}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasUsage && <AiUsageEmpty />}
        {hasUsage && totals && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricTile
                label="Mensagens"
                value={String(totals.messageCount)}
              />
              <MetricTile
                label="Tokens (in + out)"
                value={String(totals.inputTokens + totals.outputTokens)}
              />
              <MetricTile
                label="Custo estimado"
                value={microcentsToBrl(totals.totalCostMicrocents)}
              />
            </div>
            <div data-slot="ai-usage-chart">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="aiUsageFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-primary)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <Tooltip content={<AiUsageTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    name="Mensagens"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#aiUsageFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
