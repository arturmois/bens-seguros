'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'
import { getGetOrganizationQueryKey } from '@/api/endpoints/organization/organization'

import type { OrganizationData } from '../types'

export const ORGANIZATION_KEY = getGetOrganizationQueryKey()

export function useOrganization() {
  return useQuery({
    queryKey: ORGANIZATION_KEY,
    queryFn: async () => {
      const response = await api.get<OrganizationData>('/api/v1/organization')
      return response.data
    },
    staleTime: 60_000,
  })
}
