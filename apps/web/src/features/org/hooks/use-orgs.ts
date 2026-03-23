'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { setActiveOrgCookie, getActiveOrgCookie } from '@/lib/org-cookie'
import type { Role } from '@repo/auth/roles'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const VALID_ROLES = new Set<string>([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'COMMERCIAL',
  'VIEWER',
])

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.has(value)
}

export interface Org {
  id: string
  name: string
  slug: string
  logo: string | null
  role: Role
}

interface TenantResponseData {
  id: string
  name: string
  slug: string
  logo: string | null
  role: string
}

interface TenantApiResponse {
  success: boolean
  data: TenantResponseData[]
}

function isTenantApiResponse(body: unknown): body is TenantApiResponse {
  if (typeof body !== 'object' || body === null) return false
  if (!('success' in body) || !('data' in body)) return false

  return body.success === true && Array.isArray(body.data)
}

export function useOrgs() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { session, isAuthenticated } = useAuth()

  const orgsQuery = useQuery({
    queryKey: ['orgs'],
    queryFn: async (): Promise<Org[]> => {
      const res = await fetch(`${API_URL}/api/v1/tenants`, {
        credentials: 'include',
      })

      if (!res.ok) {
        return []
      }

      const body: unknown = await res.json()

      if (!isTenantApiResponse(body)) {
        return []
      }

      const orgs: Org[] = []
      for (const item of body.data) {
        if (!isRole(item.role)) continue
        orgs.push({
          id: item.id,
          name: item.name,
          slug: item.slug,
          logo: item.logo ?? null,
          role: item.role,
        })
      }
      return orgs
    },
    enabled: isAuthenticated,
  })

  // Use session activeOrganizationId, fallback to cookie (session may be stale after login)
  const activeOrgId = session?.activeOrganizationId ?? getActiveOrgCookie()
  const activeOrg =
    orgsQuery.data?.find((org) => org.id === activeOrgId) ?? null

  const switchOrg = useCallback(
    async (organizationId: string) => {
      await authClient.organization.setActive({ organizationId })
      setActiveOrgCookie(organizationId)
      await queryClient.invalidateQueries()
      router.push('/dashboard')
      router.refresh()
    },
    [queryClient, router]
  )

  return {
    orgs: orgsQuery.data ?? [],
    activeOrg,
    isLoading: orgsQuery.isLoading,
    switchOrg,
  }
}
