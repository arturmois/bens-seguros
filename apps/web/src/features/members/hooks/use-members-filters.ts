'use client'

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  useQueryStates,
} from 'nuqs'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { FilterValue } from '@/components/shared/filter-types'

const TOUCHED_FLAG_KEY = 'members-filters-touched'

function asBooleanValue(v: FilterValue): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}

function asEnumValue(v: FilterValue): readonly string[] | undefined {
  return Array.isArray(v) ? v : undefined
}

function readTouchedFlag(): boolean {
  if (typeof window === 'undefined') return true
  return window.sessionStorage.getItem(TOUCHED_FLAG_KEY) === 'true'
}

function writeTouchedFlag(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(TOUCHED_FLAG_KEY, 'true')
}

export function useMembersFilters() {
  const [state, setState] = useQueryStates(
    {
      active: parseAsBoolean,
      roleIn: parseAsArrayOf(parseAsString),
      search: parseAsString.withDefault(''),
    },
    { history: 'push' }
  )
  const [touched, setTouched] = useState<boolean>(readTouchedFlag)
  const initialUrlHadFilter = useRef(
    state.active !== null || (state.roleIn !== null && state.roleIn.length > 0)
  )
  useEffect(() => {
    if (initialUrlHadFilter.current && !touched) {
      writeTouchedFlag()
      setTouched(true)
    }
  }, [touched])
  function markTouched(): void {
    if (touched) return
    writeTouchedFlag()
    setTouched(true)
  }
  const effectiveActive: boolean | undefined =
    !touched && state.active === null ? true : (state.active ?? undefined)
  const values: Readonly<Record<string, FilterValue>> = useMemo(
    () => ({
      active: effectiveActive,
      roleIn: state.roleIn ?? undefined,
    }),
    [effectiveActive, state.roleIn]
  )
  function setFilter(key: string, value: FilterValue): void {
    if (key === 'active') {
      markTouched()
      void setState({ active: asBooleanValue(value) ?? null })
      return
    }
    if (key === 'roleIn') {
      markTouched()
      const arr = asEnumValue(value)
      void setState({ roleIn: arr && arr.length > 0 ? [...arr] : null })
      return
    }
  }
  function setSearch(next: string): void {
    markTouched()
    void setState({ search: next })
  }
  function clearAll(): void {
    markTouched()
    void setState({ active: null, roleIn: null, search: '' })
  }
  return {
    active: effectiveActive,
    roleIn: state.roleIn ?? undefined,
    search: state.search,
    values,
    setFilter,
    setSearch,
    clearAll,
  }
}
