'use client'

import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs'
import { useMemo } from 'react'

import type { FilterValue } from '@/components/shared/filter-types'

function asEnumValue(v: FilterValue): readonly string[] | undefined {
  return Array.isArray(v) ? v : undefined
}

export function useClaimsFilters() {
  const [state, setState] = useQueryStates(
    {
      statusIn: parseAsArrayOf(parseAsString),
      priorityIn: parseAsArrayOf(parseAsString),
      statusGroup: parseAsString,
      search: parseAsString.withDefault(''),
    },
    { history: 'push' }
  )

  const values: Readonly<Record<string, FilterValue>> = useMemo(
    () => ({
      statusIn: state.statusIn ?? undefined,
      priorityIn: state.priorityIn ?? undefined,
    }),
    [state.statusIn, state.priorityIn]
  )

  const apiParams = useMemo(
    () => ({
      statusIn: state.statusIn?.length ? state.statusIn.join(',') : undefined,
      priorityIn: state.priorityIn?.length
        ? state.priorityIn.join(',')
        : undefined,
      statusGroup: state.statusGroup ?? undefined,
      search: state.search || undefined,
    }),
    [state.statusIn, state.priorityIn, state.statusGroup, state.search]
  )

  function setFilter(key: string, value: FilterValue): void {
    if (key === 'statusIn' || key === 'priorityIn') {
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
      priorityIn: null,
      statusGroup: null,
      search: '',
    })
  }

  return {
    statusIn: state.statusIn ?? undefined,
    priorityIn: state.priorityIn ?? undefined,
    search: state.search,
    values,
    apiParams,
    setFilter,
    setSearch,
    clearAll,
  }
}
