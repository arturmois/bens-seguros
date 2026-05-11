'use client'

import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs'
import { useMemo } from 'react'

import type { FilterValue } from '@/components/shared/filter-types'

function asEnumValue(v: FilterValue): readonly string[] | undefined {
  return Array.isArray(v) ? v : undefined
}

function toBoolean(arr: readonly string[] | null): boolean | undefined {
  if (!arr || arr.length !== 1) return undefined
  return arr[0] === 'true'
}

export function useMembersFilters() {
  const [state, setState] = useQueryStates(
    {
      active: parseAsArrayOf(parseAsString),
      roleIn: parseAsArrayOf(parseAsString),
      search: parseAsString.withDefault(''),
    },
    { history: 'push' }
  )
  const activeArray = state.active ?? undefined
  const active = useMemo(() => toBoolean(state.active), [state.active])
  const values: Readonly<Record<string, FilterValue>> = useMemo(
    () => ({
      active: activeArray,
      roleIn: state.roleIn ?? undefined,
    }),
    [activeArray, state.roleIn]
  )
  function setFilter(key: string, value: FilterValue): void {
    if (key === 'active') {
      const arr = asEnumValue(value)
      void setState({ active: arr && arr.length > 0 ? [...arr] : null })
      return
    }
    if (key === 'roleIn') {
      const arr = asEnumValue(value)
      void setState({ roleIn: arr && arr.length > 0 ? [...arr] : null })
      return
    }
  }
  function setSearch(next: string): void {
    void setState({ search: next })
  }
  function clearAll(): void {
    void setState({ active: null, roleIn: null, search: '' })
  }
  return {
    active,
    roleIn: state.roleIn ?? undefined,
    search: state.search,
    values,
    setFilter,
    setSearch,
    clearAll,
  }
}
