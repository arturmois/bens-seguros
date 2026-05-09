'use client'

import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { FilterValue } from '@/components/shared/filter-types'

const TOUCHED_FLAG_KEY = 'channels-filters-touched'

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

export function useChannelsFilters() {
  const [state, setState] = useQueryStates(
    {
      statusIn: parseAsArrayOf(parseAsString),
      search: parseAsString.withDefault(''),
    },
    { history: 'push' }
  )

  const [touched, setTouched] = useState<boolean>(readTouchedFlag)

  const initialUrlHadStatus = useRef(
    state.statusIn !== null && state.statusIn.length > 0
  )
  useEffect(() => {
    if (initialUrlHadStatus.current && !touched) {
      writeTouchedFlag()
      setTouched(true)
    }
  }, [touched])

  function markTouched(): void {
    if (touched) return
    writeTouchedFlag()
    setTouched(true)
  }

  const effectiveStatusIn: readonly string[] | undefined = useMemo(() => {
    if (!touched && (state.statusIn === null || state.statusIn.length === 0)) {
      return ['CONNECTED']
    }
    return state.statusIn ?? undefined
  }, [state.statusIn, touched])

  const values: Readonly<Record<string, FilterValue>> = useMemo(
    () => ({ statusIn: effectiveStatusIn }),
    [effectiveStatusIn]
  )

  function setFilter(key: string, value: FilterValue): void {
    if (key !== 'statusIn') return
    markTouched()
    const arr = asEnumValue(value)
    void setState({ statusIn: arr && arr.length > 0 ? [...arr] : null })
  }

  function setSearch(next: string): void {
    markTouched()
    void setState({ search: next })
  }

  function clearAll(): void {
    markTouched()
    void setState({ statusIn: null, search: '' })
  }

  return {
    statusIn: effectiveStatusIn,
    search: state.search,
    values,
    setFilter,
    setSearch,
    clearAll,
  }
}
