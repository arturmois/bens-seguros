'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { setActiveOrgCookie, clearActiveOrgCookie } from '@/lib/org-cookie';

async function fetchSession() {
  const response = await authClient.getSession();

  if (response.error) {
    return null;
  }

  return response.data;
}

export function useAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: fetchSession,
    retry: false,
  });

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authClient.signIn.email({ email, password }),
    onSuccess: async (response) => {
      const invitationId = searchParams.get('invitationId');

      if (invitationId) {
        await handleInvitationAfterLogin(invitationId);
        return;
      }

      const activeOrgId =
        response.data && 'session' in response.data
          ? (response.data.session as Record<string, unknown>)?.activeOrganizationId
          : undefined;

      if (typeof activeOrgId === 'string') {
        setActiveOrgCookie(activeOrgId);
      }

      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/');
    },
  });

  const register = useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      authClient.signUp.email({ email, password, name }),
    onSuccess: async () => {
      const invitationId = searchParams.get('invitationId');

      if (invitationId) {
        await handleInvitationAfterLogin(invitationId);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/onboarding');
    },
  });

  const logout = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      clearActiveOrgCookie();
      queryClient.clear();
      router.push('/login');
    },
  });

  async function handleInvitationAfterLogin(invitationId: string) {
    try {
      const res = await authClient.organization.acceptInvitation({
        invitationId,
      });

      if (!res.error) {
        const member = res.data as Record<string, unknown> | undefined;
        const orgId = typeof member?.organizationId === 'string' ? member.organizationId : null;

        if (orgId) {
          await authClient.organization.setActive({ organizationId: orgId });
          setActiveOrgCookie(orgId);
        }
      }
    } catch {
      // Invitation acceptance failed — continue with normal flow.
      // The user can still access the accept-invitation page separately.
    }

    queryClient.invalidateQueries({ queryKey: ['auth'] });
    router.push('/');
  }

  return {
    user: session.data?.user ?? null,
    session: session.data?.session ?? null,
    isLoading: session.isLoading,
    isAuthenticated: !!session.data?.user,
    login,
    register,
    logout,
  };
}
