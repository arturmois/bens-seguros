'use client'

import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs'
import { useMemo } from 'react'

import { CUSTOM_PRESET, findPreset } from '@/components/shared/filter-presets'
import type {
  DateRangeValue,
  FilterValue,
} from '@/components/shared/filter-types'

function asEnumValue(v: FilterValue): readonly string[] | undefined {
  return Array.isArray(v) ? v : undefined
}

function asDateRangeValue(v: FilterValue): DateRangeValue | undefined {
  return typeof v === 'object' && v !== null && 'preset' in v ? v : undefined
}

function resolveDateRange(
  preset: string | null,
  fromInput: string | null,
  toInput: string | null
): { from?: string; to?: string } {
  if (!preset) return {}
  if (preset !== CUSTOM_PRESET) {
    const found = findPreset(preset)
    if (!found) return {}
    const range = found.compute()
    return { from: range.from.toISOString(), to: range.to.toISOString() }
  }
  const from = fromInput
    ? new Date(`${fromInput}T00:00:00`).toISOString()
    : undefined
  const to = toInput
    ? new Date(`${toInput}T23:59:59.999`).toISOString()
    : undefined
  return { from, to }
}

export function useAuditFilters() {
  const [state, setState] = useQueryStates(
    {
      actionIn: parseAsArrayOf(parseAsString),
      entityTypeIn: parseAsArrayOf(parseAsString),
      createdAtPreset: parseAsString,
      createdAtFrom: parseAsString,
      createdAtTo: parseAsString,
    },
    { history: 'push' }
  )
  const values: Readonly<Record<string, FilterValue>> = useMemo(() => {
    const createdAt: DateRangeValue | undefined = state.createdAtPreset
      ? {
          preset: state.createdAtPreset,
          from: state.createdAtFrom ?? undefined,
          to: state.createdAtTo ?? undefined,
        }
      : undefined
    return {
      actionIn: state.actionIn ?? undefined,
      entityTypeIn: state.entityTypeIn ?? undefined,
      createdAt,
    }
  }, [state])
  const apiParams = useMemo(() => {
    const created = resolveDateRange(
      state.createdAtPreset,
      state.createdAtFrom,
      state.createdAtTo
    )
    return {
      actionIn: state.actionIn?.length ? state.actionIn.join(',') : undefined,
      entityTypeIn: state.entityTypeIn?.length
        ? state.entityTypeIn.join(',')
        : undefined,
      dateFrom: created.from,
      dateTo: created.to,
    }
  }, [state])
  function setFilter(key: string, value: FilterValue): void {
    if (key === 'actionIn' || key === 'entityTypeIn') {
      const arr = asEnumValue(value)
      void setState({ [key]: arr && arr.length > 0 ? [...arr] : null })
      return
    }
    if (key === 'createdAt') {
      const range = asDateRangeValue(value)
      void setState({
        createdAtPreset: range?.preset ?? null,
        createdAtFrom: range?.from ?? null,
        createdAtTo: range?.to ?? null,
      })
    }
  }
  function clearAll(): void {
    void setState({
      actionIn: null,
      entityTypeIn: null,
      createdAtPreset: null,
      createdAtFrom: null,
      createdAtTo: null,
    })
  }
  return {
    actionIn: state.actionIn ?? undefined,
    entityTypeIn: state.entityTypeIn ?? undefined,
    values,
    apiParams,
    setFilter,
    clearAll,
  }
}
