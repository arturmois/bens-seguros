'use client'

import { useCallback, useRef, useState } from 'react'

import { getCep } from '@/api/endpoints/cep/cep'
import type { GetCep200Data } from '@/api/model'
import { ApiError } from '@/lib/api-client'

export type CepLookupErrorType =
  | 'not-found'
  | 'provider-unavailable'
  | 'network'

export interface CepLookupError {
  readonly type: CepLookupErrorType
}

export interface UseCepLookupReturn {
  readonly lookup: (cep: string) => Promise<GetCep200Data | null>
  readonly isLoading: boolean
  readonly error: CepLookupError | null
}

function classifyError(error: unknown): CepLookupErrorType {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'not-found'
    if (error.status === 502) return 'provider-unavailable'
  }
  return 'network'
}

export function useCepLookup(): UseCepLookupReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<CepLookupError | null>(null)
  const requestIdRef = useRef(0)

  const lookup = useCallback(
    async (cep: string): Promise<GetCep200Data | null> => {
      const normalized = cep.replace(/\D/g, '')
      if (normalized.length !== 8) {
        return null
      }

      const requestId = ++requestIdRef.current
      setIsLoading(true)
      setError(null)

      try {
        const response = await getCep(normalized)
        if (requestId !== requestIdRef.current) return null
        if (response.status !== 200) return null
        return response.data.data
      } catch (err) {
        if (requestId !== requestIdRef.current) return null
        setError({ type: classifyError(err) })
        return null
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    []
  )

  return { lookup, isLoading, error }
}
