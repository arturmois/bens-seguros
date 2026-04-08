'use client'

import { Area, AreaChart } from 'recharts'

interface ClientSparklineProps {
  readonly clientId?: string
  readonly data?: readonly { value: number }[]
}

function generateMockTrend(seed: string): { value: number }[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  const points: { value: number }[] = []
  let current = 50
  for (let i = 0; i < 7; i++) {
    hash = ((hash << 5) - hash + i) | 0
    current += (Math.abs(hash) % 30) - 12
    current = Math.max(10, Math.min(100, current))
    points.push({ value: current })
  }
  return points
}

export function ClientSparkline({ clientId, data }: ClientSparklineProps) {
  const points = data ?? generateMockTrend(clientId ?? 'default')
  const first = points[0]?.value ?? 0
  const last = points[points.length - 1]?.value ?? 0
  const isPositive = last >= first
  const color = isPositive ? '#22c55e' : '#ef4444'

  return (
    <AreaChart width={60} height={24} data={points}>
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        fill={color}
        fillOpacity={0.1}
        strokeWidth={1.5}
        isAnimationActive={false}
      />
    </AreaChart>
  )
}
