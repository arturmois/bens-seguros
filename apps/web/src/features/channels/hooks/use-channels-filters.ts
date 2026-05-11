'use client'

import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs'
import { useMemo } from 'react'

import type { FilterValue } from '@/components/shared/filter-types'

function asEnumValue(v: FilterValue): readonly string[] | undefined {
  return Array.isArray(v) ? v : undefined
}

export function useChannelsFilters() {
  const [state, setState] = useQueryStates(
    {
      statusIn: parseAsArrayOf(parseAsString),
      search: parseAsString.withDefault(''),
    },
    { history: 'push' }
  )
  const statusIn = state.statusIn ?? undefined
  const values: Readonly<Record<string, FilterValue>> = useMemo(
    () => ({ statusIn }),
    [statusIn]
  )
  function setFilter(key: string, value: FilterValue): void {
    if (key !== 'statusIn') return
    const arr = asEnumValue(value)
    void setState({ statusIn: arr && arr.length > 0 ? [...arr] : null })
  }
  function setSearch(next: string): void {
    void setState({ search: next })
  }
  function clearAll(): void {
    void setState({ statusIn: null, search: '' })
  }
  return {
    statusIn,
    search: state.search,
    values,
    setFilter,
    setSearch,
    clearAll,
  }
}
