'use client'

import { useMemo } from 'react'

import type { FilterOption } from '@/components/shared/filter-types'

import { useMembers } from './use-members'

export function useSalespersonOptions(): {
  readonly options: readonly FilterOption[]
  readonly isLoading: boolean
} {
  const { data, isLoading } = useMembers()

  const options = useMemo<readonly FilterOption[]>(() => {
    const members = data ?? []
    return members.map((m) => ({
      value: m.userId,
      label: m.name ?? m.email,
    }))
  }, [data])

  return { options, isLoading }
}
