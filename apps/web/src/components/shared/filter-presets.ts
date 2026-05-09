import {
  addDays,
  endOfMonth,
  endOfQuarter,
  endOfToday,
  startOfMonth,
  startOfQuarter,
  startOfToday,
  subDays,
} from 'date-fns'

export interface DateRangePreset {
  readonly value: string
  readonly label: string
  readonly compute: () => { readonly from: Date; readonly to: Date }
}

export const DATE_RANGE_PRESETS: readonly DateRangePreset[] = [
  {
    value: 'today',
    label: 'Hoje',
    compute: () => ({ from: startOfToday(), to: endOfToday() }),
  },
  {
    value: 'last_7d',
    label: 'Últimos 7 dias',
    compute: () => ({ from: subDays(startOfToday(), 6), to: endOfToday() }),
  },
  {
    value: 'last_30d',
    label: 'Últimos 30 dias',
    compute: () => ({ from: subDays(startOfToday(), 29), to: endOfToday() }),
  },
  {
    value: 'this_month',
    label: 'Este mês',
    compute: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    value: 'this_quarter',
    label: 'Este trimestre',
    compute: () => ({
      from: startOfQuarter(new Date()),
      to: endOfQuarter(new Date()),
    }),
  },
  {
    value: 'expiring-7d',
    label: 'Vencendo em 7 dias',
    compute: () => ({ from: startOfToday(), to: addDays(startOfToday(), 7) }),
  },
] as const

export const CUSTOM_PRESET = 'custom'

export function findPreset(
  value: string | undefined
): DateRangePreset | undefined {
  return DATE_RANGE_PRESETS.find((p) => p.value === value)
}
