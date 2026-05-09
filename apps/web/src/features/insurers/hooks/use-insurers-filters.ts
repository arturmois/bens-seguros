'use client'

import { parseAsBoolean, parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { FilterValue } from '@/components/shared/filter-types'

const TOUCHED_FLAG_KEY = 'insurers-filters-touched'

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

export function useInsurersFilters() {
  const [state, setState] = useQueryStates(
    {
      active: parseAsBoolean,
      search: parseAsString.withDefault(''),
    },
    { history: 'push' }
  )

  const [touched, setTouched] = useState<boolean>(readTouchedFlag)

  // A URL that already carries ?active means the user (or the link author)
  // has expressed intent — treat the session as touched so the default does
  // not silently override their choice on the next render.
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

  const apiParams = useMemo(
    () => ({
      active: effectiveActive,
      search: state.search || undefined,
    }),
    [effectiveActive, state.search]
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
    values,
    apiParams,
    search: state.search,
    setFilter,
    setSearch,
    clearAll,
  }
}
