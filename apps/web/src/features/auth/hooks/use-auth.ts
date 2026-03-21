'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

async function fetchSession() {
  const response = await authClient.getSession();

  if (response.error) {
    return null;
  }

  return response.data;
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: fetchSession,
    retry: false,
  });

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authClient.signIn.email({ email, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/');
    },
  });

  const register = useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      authClient.signUp.email({ email, password, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/');
    },
  });

  const logout = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

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
