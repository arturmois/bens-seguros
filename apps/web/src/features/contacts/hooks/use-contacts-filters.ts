'use client'

import { useMemo } from 'react'
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  useQueryStates,
} from 'nuqs'
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

function asBooleanValue(v: FilterValue): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}

export function useContactsFilters() {
  const [state, setState] = useQueryStates(
    {
      stageIn: parseAsArrayOf(parseAsString),
      sourceIn: parseAsArrayOf(parseAsString),
      salespersonIdIn: parseAsArrayOf(parseAsString),
      consentLgpd: parseAsBoolean,
      createdAtPreset: parseAsString,
      createdAtFrom: parseAsString,
      createdAtTo: parseAsString,
      search: parseAsString.withDefault(''),
    },
    { history: 'push' }
  )

  // Estado consolidado pra alimentar o UnifiedFilterBar
  const values: Readonly<Record<string, FilterValue>> = useMemo(() => {
    const range: DateRangeValue | undefined = state.createdAtPreset
      ? {
          preset: state.createdAtPreset,
          from: state.createdAtFrom ?? undefined,
          to: state.createdAtTo ?? undefined,
        }
      : undefined
    return {
      stageIn: state.stageIn ?? undefined,
      sourceIn: state.sourceIn ?? undefined,
      salespersonIdIn: state.salespersonIdIn ?? undefined,
      consentLgpd: state.consentLgpd ?? undefined,
      createdAt: range,
    }
  }, [state])

  // Derivação dos params da API a partir do estado
  const apiParams = useMemo(() => {
    let createdFrom: string | undefined
    let createdTo: string | undefined

    if (state.createdAtPreset && state.createdAtPreset !== CUSTOM_PRESET) {
      const preset = findPreset(state.createdAtPreset)
      if (preset) {
        const range = preset.compute()
        createdFrom = range.from.toISOString()
        createdTo = range.to.toISOString()
      }
    } else if (state.createdAtPreset === CUSTOM_PRESET) {
      // The custom-range UI emits `yyyy-MM-dd` strings; expand to start/end of
      // day so a "01/04 → 30/04" window covers the entire 30th and not just
      // its midnight tick (z.coerce.date() parses bare dates as UTC midnight).
      if (state.createdAtFrom) {
        createdFrom = new Date(`${state.createdAtFrom}T00:00:00`).toISOString()
      }
      if (state.createdAtTo) {
        createdTo = new Date(`${state.createdAtTo}T23:59:59.999`).toISOString()
      }
    }

    return {
      stageIn: state.stageIn?.length ? state.stageIn.join(',') : undefined,
      sourceIn: state.sourceIn?.length ? state.sourceIn.join(',') : undefined,
      salespersonIdIn: state.salespersonIdIn?.length
        ? state.salespersonIdIn.join(',')
        : undefined,
      consentLgpd: state.consentLgpd ?? undefined,
      createdFrom,
      createdTo,
      search: state.search || undefined,
    }
  }, [state])

  function setFilter(key: string, value: FilterValue) {
    if (key === 'createdAt') {
      const range = asDateRangeValue(value)
      void setState({
        createdAtPreset: range?.preset ?? null,
        createdAtFrom: range?.from ?? null,
        createdAtTo: range?.to ?? null,
      })
      return
    }
    if (key === 'stageIn' || key === 'sourceIn' || key === 'salespersonIdIn') {
      const arr = asEnumValue(value)
      void setState({ [key]: arr && arr.length > 0 ? [...arr] : null })
      return
    }
    if (key === 'consentLgpd') {
      const bool = asBooleanValue(value)
      void setState({ consentLgpd: bool ?? null })
      return
    }
  }

  function setSearch(next: string) {
    void setState({ search: next })
  }

  function clearAll() {
    void setState({
      stageIn: null,
      sourceIn: null,
      salespersonIdIn: null,
      consentLgpd: null,
      createdAtPreset: null,
      createdAtFrom: null,
      createdAtTo: null,
    })
  }

  return {
    values,
    apiParams,
    search: state.search,
    setFilter,
    setSearch,
    clearAll,
  }
}
