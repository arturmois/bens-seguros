'use client'

import { parseAsBoolean, parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { FilterValue } from '@/components/shared/filter-types'

const TOUCHED_FLAG_KEY = 'ai-agents-filters-touched'

function asBooleanValue(v: FilterValue): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}

function readTouchedFlag(): boolean {
  if (typeof window === 'undefined') return true
  return window.sessionStorage.getItem(TOUCHED_FLAG_KEY) === 'true'
}

function writeTouchedFlag(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(TOUCHED_FLAG_KEY, 'true')
}

export function useAiAgentsFilters() {
  const [state, setState] = useQueryStates(
    {
      active: parseAsBoolean,
      search: parseAsString.withDefault(''),
    },
    { history: 'push' }
  )
  const [touched, setTouched] = useState<boolean>(readTouchedFlag)
  const initialUrlHadActive = useRef(state.active !== null)
  useEffect(() => {
    if (initialUrlHadActive.current && !touched) {
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
    () => ({ active: effectiveActive }),
    [effectiveActive]
  )
  function setFilter(key: string, value: FilterValue): void {
    if (key !== 'active') return
    markTouched()
    void setState({ active: asBooleanValue(value) ?? null })
  }
  function setSearch(next: string): void {
    markTouched()
    void setState({ search: next })
  }
  function clearAll(): void {
    markTouched()
    void setState({ active: null, search: '' })
  }
  return {
    active: effectiveActive,
    search: state.search,
    values,
    setFilter,
    setSearch,
    clearAll,
  }
}
