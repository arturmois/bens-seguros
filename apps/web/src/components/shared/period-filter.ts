export const PERIOD_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Todas' },
  { value: 'MONTH', label: '30 dias' },
  { value: 'WEEK', label: '7 dias' },
  { value: 'TODAY', label: 'Hoje' },
] as const

export type PeriodFilter = (typeof PERIOD_FILTER_OPTIONS)[number]['value']

export function isPeriodFilter(value: string): value is PeriodFilter {
  return (
    value === 'ALL' ||
    value === 'MONTH' ||
    value === 'WEEK' ||
    value === 'TODAY'
  )
}

export function resolvePeriodRange(period: PeriodFilter): {
  dateFrom?: string
  dateTo?: string
} {
  if (period === 'ALL') return {}
  const now = new Date()
  const dateTo = now.toISOString()
  const from = new Date(now)
  if (period === 'TODAY') from.setHours(0, 0, 0, 0)
  if (period === 'WEEK') from.setDate(from.getDate() - 7)
  if (period === 'MONTH') from.setDate(from.getDate() - 30)
  return { dateFrom: from.toISOString(), dateTo }
}
