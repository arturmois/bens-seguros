'use client'

import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs'
import { useMemo } from 'react'

import { CUSTOM_PRESET, findPreset } from '@/components/shared/filter-presets'
import type {
  DateRangeValue,
  FilterValue,
} from '@/components/shared/filter-types'

type ViewMode = 'table' | 'kanban'

const VIEW_MODES = ['table', 'kanban'] as const

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

export function useProposalsFilters() {
  const [state, setState] = useQueryStates(
    {
      view: parseAsStringLiteral(VIEW_MODES).withDefault('table'),
      search: parseAsString.withDefault(''),
      stageIn: parseAsArrayOf(parseAsString),
      branchIn: parseAsArrayOf(parseAsString),
      salespersonIdIn: parseAsArrayOf(parseAsString),
      createdAtPreset: parseAsString,
      createdAtFrom: parseAsString,
      createdAtTo: parseAsString,
      updatedAtPreset: parseAsString,
      updatedAtFrom: parseAsString,
      updatedAtTo: parseAsString,
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
    const updatedAt: DateRangeValue | undefined = state.updatedAtPreset
      ? {
          preset: state.updatedAtPreset,
          from: state.updatedAtFrom ?? undefined,
          to: state.updatedAtTo ?? undefined,
        }
      : undefined
    return {
      stageIn: state.stageIn ?? undefined,
      branchIn: state.branchIn ?? undefined,
      salespersonIdIn: state.salespersonIdIn ?? undefined,
      createdAt,
      updatedAt,
    }
  }, [state])

  const apiParams = useMemo(() => {
    const created = resolveDateRange(
      state.createdAtPreset,
      state.createdAtFrom,
      state.createdAtTo
    )
    const updated = resolveDateRange(
      state.updatedAtPreset,
      state.updatedAtFrom,
      state.updatedAtTo
    )
    return {
      stageIn: state.stageIn?.length ? state.stageIn.join(',') : undefined,
      branchIn: state.branchIn?.length ? state.branchIn.join(',') : undefined,
      salespersonIdIn: state.salespersonIdIn?.length
        ? state.salespersonIdIn.join(',')
        : undefined,
      createdFrom: created.from,
      createdTo: created.to,
      updatedAtFrom: updated.from,
      updatedAtTo: updated.to,
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
    if (key === 'updatedAt') {
      const range = asDateRangeValue(value)
      void setState({
        updatedAtPreset: range?.preset ?? null,
        updatedAtFrom: range?.from ?? null,
        updatedAtTo: range?.to ?? null,
      })
      return
    }
    if (key === 'stageIn' || key === 'branchIn' || key === 'salespersonIdIn') {
      const arr = asEnumValue(value)
      void setState({ [key]: arr && arr.length > 0 ? [...arr] : null })
      return
    }
  }

  function setSearch(next: string) {
    void setState({ search: next })
  }

  function setView(next: ViewMode) {
    void setState({ view: next })
  }

  function clearAll() {
    void setState({
      stageIn: null,
      branchIn: null,
      salespersonIdIn: null,
      createdAtPreset: null,
      createdAtFrom: null,
      createdAtTo: null,
      updatedAtPreset: null,
      updatedAtFrom: null,
      updatedAtTo: null,
    })
  }

  return {
    view: state.view,
    search: state.search,
    values,
    apiParams,
    setFilter,
    setSearch,
    setView,
    clearAll,
  }
}
