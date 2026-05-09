'use client'

import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  ListPoliciesBoardType,
  ListPoliciesBranch,
  ListPoliciesStatus,
} from '@/api/model'
import type {
  DateRangeValue,
  FilterValue,
} from '@/components/shared/filter-types'

const TOUCHED_FLAG_KEY = 'policies-filters-touched'
const EXPIRING_7D_PRESET = 'expiring-7d'
const EXPIRING_7D_DAYS = 7

const STATUS_VALUES: readonly ListPoliciesStatus[] = [
  'ACTIVE',
  'CANCELLED',
  'EXPIRED',
]

const BRANCH_VALUES: readonly ListPoliciesBranch[] = [
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
]

const BOARD_TYPE_VALUES: readonly ListPoliciesBoardType[] = [
  'NEW_INSURANCE',
  'RENEWAL',
  'ENDORSEMENT',
]

function asEnumValue(v: FilterValue): readonly string[] | undefined {
  return Array.isArray(v) ? v : undefined
}

function isOneOf<T extends string>(
  values: readonly T[],
  candidate: string
): candidate is T {
  return values.some((v) => v === candidate)
}

function asStatus(v: string | null): ListPoliciesStatus | undefined {
  return v !== null && isOneOf(STATUS_VALUES, v) ? v : undefined
}

function asBranch(v: string | null): ListPoliciesBranch | undefined {
  return v !== null && isOneOf(BRANCH_VALUES, v) ? v : undefined
}

function asBoardType(v: string | null): ListPoliciesBoardType | undefined {
  return v !== null && isOneOf(BOARD_TYPE_VALUES, v) ? v : undefined
}

function readTouchedFlag(): boolean {
  if (typeof window === 'undefined') return true
  return window.sessionStorage.getItem(TOUCHED_FLAG_KEY) === 'true'
}

function writeTouchedFlag(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(TOUCHED_FLAG_KEY, 'true')
}

function computeExpiring7dRange(): { from: string; to: string } {
  const now = new Date()
  const to = new Date(now.getTime() + EXPIRING_7D_DAYS * 24 * 60 * 60 * 1000)
  return { from: now.toISOString(), to: to.toISOString() }
}

export function usePoliciesFilters() {
  const [state, setState] = useQueryStates(
    {
      statusIn: parseAsArrayOf(parseAsString),
      branchIn: parseAsArrayOf(parseAsString),
      boardTypeIn: parseAsArrayOf(parseAsString),
      status: parseAsString,
      branch: parseAsString,
      boardType: parseAsString,
      search: parseAsString.withDefault(''),
      endDateFrom: parseAsString,
      endDateTo: parseAsString,
      createdFrom: parseAsString,
      createdTo: parseAsString,
      filter: parseAsString,
    },
    { history: 'push' }
  )

  const [touched, setTouched] = useState<boolean>(readTouchedFlag)

  const initialUrlHadAnyValue = useRef<boolean>(
    Boolean(
      state.statusIn?.length ||
      state.branchIn?.length ||
      state.boardTypeIn?.length ||
      state.status ||
      state.branch ||
      state.boardType ||
      state.search ||
      state.endDateFrom ||
      state.endDateTo ||
      state.createdFrom ||
      state.createdTo ||
      state.filter
    )
  )

  useEffect(() => {
    if (initialUrlHadAnyValue.current && !touched) {
      writeTouchedFlag()
      setTouched(true)
    }
  }, [touched])

  function markTouched() {
    if (touched) return
    writeTouchedFlag()
    setTouched(true)
  }

  const expiring7dRange = useMemo(() => {
    if (state.filter !== EXPIRING_7D_PRESET) return null
    return computeExpiring7dRange()
  }, [state.filter])

  const effectiveStatusIn = useMemo<readonly string[] | undefined>(() => {
    if (!touched && (state.statusIn === null || state.statusIn?.length === 0)) {
      return ['ACTIVE']
    }
    return state.statusIn ?? undefined
  }, [state.statusIn, touched])

  const endDateRangeValue = useMemo<DateRangeValue | undefined>(() => {
    if (expiring7dRange) {
      return {
        preset: EXPIRING_7D_PRESET,
        from: expiring7dRange.from,
        to: expiring7dRange.to,
      }
    }
    if (state.endDateFrom || state.endDateTo) {
      return {
        preset: 'custom',
        from: state.endDateFrom ?? undefined,
        to: state.endDateTo ?? undefined,
      }
    }
    return undefined
  }, [expiring7dRange, state.endDateFrom, state.endDateTo])

  const createdRangeValue = useMemo<DateRangeValue | undefined>(() => {
    if (!state.createdFrom && !state.createdTo) return undefined
    return {
      preset: 'custom',
      from: state.createdFrom ?? undefined,
      to: state.createdTo ?? undefined,
    }
  }, [state.createdFrom, state.createdTo])

  const values: Readonly<Record<string, FilterValue>> = useMemo(
    () => ({
      statusIn: effectiveStatusIn,
      branchIn: state.branchIn ?? undefined,
      boardTypeIn: state.boardTypeIn ?? undefined,
      endDateRange: endDateRangeValue,
      createdRange: createdRangeValue,
    }),
    [
      effectiveStatusIn,
      state.branchIn,
      state.boardTypeIn,
      endDateRangeValue,
      createdRangeValue,
    ]
  )

  const apiParams = useMemo(
    () => ({
      statusIn: effectiveStatusIn?.length
        ? [...effectiveStatusIn].join(',')
        : undefined,
      branchIn: state.branchIn?.length ? state.branchIn.join(',') : undefined,
      boardTypeIn: state.boardTypeIn?.length
        ? state.boardTypeIn.join(',')
        : undefined,
      status: asStatus(state.status),
      branch: asBranch(state.branch),
      boardType: asBoardType(state.boardType),
      search: state.search || undefined,
      endDateFrom: expiring7dRange?.from ?? state.endDateFrom ?? undefined,
      endDateTo: expiring7dRange?.to ?? state.endDateTo ?? undefined,
      createdFrom: state.createdFrom || undefined,
      createdTo: state.createdTo || undefined,
    }),
    [
      effectiveStatusIn,
      state.branchIn,
      state.boardTypeIn,
      state.status,
      state.branch,
      state.boardType,
      state.search,
      state.endDateFrom,
      state.endDateTo,
      state.createdFrom,
      state.createdTo,
      expiring7dRange,
    ]
  )

  function setFilter(key: string, value: FilterValue) {
    markTouched()
    if (key === 'statusIn' || key === 'branchIn' || key === 'boardTypeIn') {
      const arr = asEnumValue(value)
      void setState({ [key]: arr && arr.length > 0 ? [...arr] : null })
      return
    }
    if (key === 'endDateRange') {
      void setState({ filter: null, endDateFrom: null, endDateTo: null })
      return
    }
    if (key === 'createdRange') {
      void setState({ createdFrom: null, createdTo: null })
      return
    }
  }

  function setSearch(next: string) {
    markTouched()
    void setState({ search: next })
  }

  function clearAll() {
    markTouched()
    void setState({
      statusIn: null,
      branchIn: null,
      boardTypeIn: null,
      status: null,
      branch: null,
      boardType: null,
      search: '',
      endDateFrom: null,
      endDateTo: null,
      filter: null,
      createdFrom: null,
      createdTo: null,
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
