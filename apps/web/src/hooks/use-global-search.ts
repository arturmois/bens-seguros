'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { GlobalSearchResults } from '@/components/shared/command-palette.types'
import { useDebounce } from './use-debounce'

const GLOBAL_SEARCH_KEY = 'global-search'
const MIN_QUERY_LENGTH = 2
const DEFAULT_DEBOUNCE_MS = 300
const DEFAULT_LIMIT = 10

interface UseGlobalSearchOptions {
  readonly debounceMs?: number
  readonly limit?: number
}

export function useGlobalSearch(
  query: string,
  options?: UseGlobalSearchOptions
) {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const limit = options?.limit ?? DEFAULT_LIMIT
  const debouncedQuery = useDebounce(query.trim(), debounceMs)
  const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH

  const { data, isLoading } = useQuery<GlobalSearchResults>({
    queryKey: [GLOBAL_SEARCH_KEY, debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: String(limit),
      })
      const response = await api.get<GlobalSearchResults>(
        `/api/v1/search?${params.toString()}`
      )
      return response.data
    },
    enabled,
    staleTime: 30_000,
    gcTime: 60_000,
  })

  const totalResults = data
    ? data.clients.length +
      data.proposals.length +
      data.policies.length +
      data.claims.length
    : 0

  return {
    results: data,
    isLoading: enabled && isLoading,
    totalResults,
  } as const
}
