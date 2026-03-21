'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { setActiveOrgCookie } from '@/lib/org-cookie';

export interface Org {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export function useOrgs() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, isAuthenticated } = useAuth();

  const orgsQuery = useQuery({
    queryKey: ['orgs'],
    queryFn: async (): Promise<Org[]> => {
      const response = await authClient.organization.list();
      if (response.error) {
        return [];
      }
      return (response.data ?? []).map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo ?? null,
      }));
    },
    enabled: isAuthenticated,
  });

  const activeOrgId = session?.activeOrganizationId;
  const activeOrg = orgsQuery.data?.find((org) => org.id === activeOrgId) ?? null;

  async function switchOrg(organizationId: string) {
    await authClient.organization.setActive({ organizationId });
    setActiveOrgCookie(organizationId);
    queryClient.clear();
    router.push('/');
  }

  return {
    orgs: orgsQuery.data ?? [],
    activeOrg,
    isLoading: orgsQuery.isLoading,
    switchOrg,
  };
}
