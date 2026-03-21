'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { setActiveOrgCookie } from '@/lib/org-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface Org {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
}

interface TenantResponseData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
}

interface TenantApiResponse {
  success: boolean;
  data: TenantResponseData[];
}

function isTenantApiResponse(body: unknown): body is TenantApiResponse {
  if (typeof body !== 'object' || body === null) return false;
  if (!('success' in body) || !('data' in body)) return false;

  return body.success === true && Array.isArray(body.data);
}

export function useOrgs() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, isAuthenticated } = useAuth();

  const orgsQuery = useQuery({
    queryKey: ['orgs'],
    queryFn: async (): Promise<Org[]> => {
      const res = await fetch(`${API_URL}/api/v1/tenants`, {
        credentials: 'include',
      });

      if (!res.ok) {
        return [];
      }

      const body: unknown = await res.json();

      if (!isTenantApiResponse(body)) {
        return [];
      }

      return body.data.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo ?? null,
        role: org.role,
      }));
    },
    enabled: isAuthenticated,
  });

  const activeOrgId = session?.activeOrganizationId;
  const activeOrg = orgsQuery.data?.find((org) => org.id === activeOrgId) ?? null;

  const switchOrg = useCallback(
    async (organizationId: string) => {
      await authClient.organization.setActive({ organizationId });
      setActiveOrgCookie(organizationId);
      await queryClient.invalidateQueries();
      router.refresh();
    },
    [queryClient, router],
  );

  return {
    orgs: orgsQuery.data ?? [],
    activeOrg,
    isLoading: orgsQuery.isLoading,
    switchOrg,
  };
}
