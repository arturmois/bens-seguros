'use client'

import {
  useGetOrganization,
  getGetOrganizationQueryKey,
} from '@/api/endpoints/organization/organization'

export const ORGANIZATION_KEY = getGetOrganizationQueryKey()

export function useOrganization() {
  return useGetOrganization({
    query: {
      select: (response) => {
        if ('data' in response.data) {
          return response.data.data
        }
        return undefined
      },
    },
  })
}
