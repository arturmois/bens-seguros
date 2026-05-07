'use client'

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  useQueryStates,
} from 'nuqs'
import { useMemo } from 'react'

import type { FilterValue } from '@/components/shared/filter-types'

function asEnumValue(v: FilterValue): readonly string[] | undefined {
  return Array.isArray(v) ? v : undefined
}

function asBooleanValue(v: FilterValue): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}

export function useClientsFilters() {
  const [state, setState] = useQueryStates(
    {
      personTypeIn: parseAsArrayOf(parseAsString),
      hasActivePolicy: parseAsBoolean,
      search: parseAsString.withDefault(''),
    },
    { history: 'push' }
  )

  const values: Readonly<Record<string, FilterValue>> = useMemo(
    () => ({
      personTypeIn: state.personTypeIn ?? undefined,
      hasActivePolicy: state.hasActivePolicy ?? undefined,
    }),
    [state]
  )

  const apiParams = useMemo(
    () => ({
      personTypeIn: state.personTypeIn?.length
        ? state.personTypeIn.join(',')
        : undefined,
      hasActivePolicy: state.hasActivePolicy ?? undefined,
      search: state.search || undefined,
    }),
    [state]
  )

  function setFilter(key: string, value: FilterValue) {
    if (key === 'personTypeIn') {
      const arr = asEnumValue(value)
      void setState({ personTypeIn: arr && arr.length > 0 ? [...arr] : null })
      return
    }
    if (key === 'hasActivePolicy') {
      const bool = asBooleanValue(value)
      void setState({ hasActivePolicy: bool ?? null })
      return
    }
  }

  function setSearch(next: string) {
    void setState({ search: next })
  }

  function clearAll() {
    void setState({
      personTypeIn: null,
      hasActivePolicy: null,
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
