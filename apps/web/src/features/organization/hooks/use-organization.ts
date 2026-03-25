'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'

import type { OrganizationData } from '../types'

const ORGANIZATION_KEY = ['organization'] as const

export { ORGANIZATION_KEY }

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
