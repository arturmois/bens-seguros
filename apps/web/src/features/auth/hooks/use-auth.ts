'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import {
  setActiveOrgCookie,
  getActiveOrgCookie,
  clearActiveOrgCookie,
} from '@/lib/org-cookie'
import { clearChatToken } from '@/features/chat/lib/chat-api'

async function fetchSession() {
  const response = await authClient.getSession()

  if (response.error) {
    return null
  }

  return response.data
}

export function useAuth() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: fetchSession,
    retry: false,
    staleTime: 30_000,
  })

  const login = useMutation({
    mutationFn: async ({
      email,
      password,
      invitationId,
    }: {
      email: string
      password: string
      invitationId?: string
    }) => {
      const response = await authClient.signIn.email({ email, password })
      if (response.error) {
        if (response.error.code === 'EMAIL_NOT_VERIFIED') {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
          return null
        }
        throw new Error(response.error.message ?? 'Falha no login')
      }
      return { ...response, invitationId }
    },
    onSuccess: async (response) => {
      if (!response) return

      const invitationId = response.invitationId

      if (invitationId) {
        await handleInvitationAfterLogin(invitationId)
        return
      }

      // Try to restore last active org from cookie (survives logout)
      const lastOrgId = getActiveOrgCookie()
      if (lastOrgId) {
        const res = await authClient.organization.setActive({
          organizationId: lastOrgId,
        })
        if (!res.error) {
          setActiveOrgCookie(lastOrgId)
          await queryClient.invalidateQueries({ queryKey: ['auth'] })
          router.push('/dashboard')
          return
        }
        // Org no longer valid for this user — clear stale cookie
        clearActiveOrgCookie()
      }

      await queryClient.invalidateQueries({ queryKey: ['auth'] })
      router.push('/select-org')
    },
  })

  const register = useMutation({
    mutationFn: async ({
      email,
      password,
      name,
      invitationId,
    }: {
      email: string
      password: string
      name: string
      invitationId?: string
    }) => {
      const response = await authClient.signUp.email({ email, password, name })
      if (response.error) {
        throw new Error(response.error.message ?? 'Falha no cadastro')
      }
      return { email, invitationId }
    },
    onSuccess: (response) => {
      // With requireEmailVerification, Better Auth does NOT create a session
      // on signup. sendOnSignUp: true sends the verification email automatically.
      const params = new URLSearchParams({ email: response.email })
      if (response.invitationId) {
        params.set('invitationId', response.invitationId)
      }
      router.push(`/verify-email?${params.toString()}`)
    },
  })

  const logout = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      clearChatToken()
      clearActiveOrgCookie()
      queryClient.clear()
      router.push('/login')
    },
  })

  async function handleInvitationAfterLogin(invitationId: string) {
    try {
      const res = await authClient.organization.acceptInvitation({
        invitationId,
      })

      if (!res.error) {
        const member = res.data
        const orgId =
          typeof member === 'object' &&
          member !== null &&
          'organizationId' in member &&
          typeof member.organizationId === 'string'
            ? member.organizationId
            : null

        if (orgId) {
          await authClient.organization.setActive({ organizationId: orgId })
          setActiveOrgCookie(orgId)
        }
      }
    } catch {
      // Invitation acceptance failed — continue with normal flow.
      // The user can still access the accept-invitation page separately.
    }

    queryClient.invalidateQueries({ queryKey: ['auth'] })
    router.push('/dashboard')
  }

  return {
    user: session.data?.user ?? null,
    session: session.data?.session ?? null,
    isLoading: session.isLoading,
    isAuthenticated: !!session.data?.user,
    login,
    register,
    logout,
  }
}
