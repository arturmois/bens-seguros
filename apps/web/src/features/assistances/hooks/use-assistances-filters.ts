'use client'

import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs'
import { useMemo } from 'react'

import type { FilterValue } from '@/components/shared/filter-types'

function asEnumValue(v: FilterValue): readonly string[] | undefined {
  return Array.isArray(v) ? v : undefined
}

export function useAssistancesFilters() {
  const [state, setState] = useQueryStates(
    {
      statusIn: parseAsArrayOf(parseAsString),
      typeIn: parseAsArrayOf(parseAsString),
      search: parseAsString.withDefault(''),
      statusGroup: parseAsString,
    },
    { history: 'push' }
  )
  const values: Readonly<Record<string, FilterValue>> = useMemo(
    () => ({
      statusIn: state.statusIn ?? undefined,
      typeIn: state.typeIn ?? undefined,
    }),
    [state.statusIn, state.typeIn]
  )
  const apiParams = useMemo(
    () => ({
      statusIn: state.statusIn?.length ? state.statusIn.join(',') : undefined,
      typeIn: state.typeIn?.length ? state.typeIn.join(',') : undefined,
      statusGroup: state.statusGroup ?? undefined,
      search: state.search || undefined,
    }),
    [state.statusIn, state.typeIn, state.statusGroup, state.search]
  )
  function setFilter(key: string, value: FilterValue): void {
    if (key === 'statusIn' || key === 'typeIn') {
      const arr = asEnumValue(value)
      void setState({ [key]: arr && arr.length > 0 ? [...arr] : null })
    }
  }
  function setSearch(next: string): void {
    void setState({ search: next })
  }
  function clearAll(): void {
    void setState({
      statusIn: null,
      typeIn: null,
      statusGroup: null,
      search: '',
    })
  }
  return {
    statusIn: state.statusIn ?? undefined,
    typeIn: state.typeIn ?? undefined,
    search: state.search,
    values,
    apiParams,
    setFilter,
    setSearch,
    clearAll,
  }
}
