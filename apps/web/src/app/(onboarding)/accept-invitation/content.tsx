'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { setActiveOrgCookie } from '@/lib/org-cookie'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

type PageStatus = 'loading' | 'success' | 'error'

export function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const invitationId = searchParams.get('id')
  const [status, setStatus] = useState<PageStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!invitationId) {
      setStatus('error')
      setErrorMessage('Link de convite inválido')
      return
    }

    if (!isAuthenticated) {
      router.replace(`/login?invitationId=${invitationId}`)
      return
    }

    acceptInvitation(invitationId)
  }, [authLoading, isAuthenticated, invitationId, router])

  async function acceptInvitation(id: string) {
    try {
      const res = await authClient.organization.acceptInvitation({
        invitationId: id,
      })

      if (res.error) {
        setStatus('error')
        setErrorMessage('Convite expirado ou já aceito')
        return
      }

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

      queryClient.clear()
      setStatus('success')
      router.push('/dashboard')
    } catch {
      setStatus('error')
      setErrorMessage('Erro ao aceitar convite')
    }
  }

  if (status === 'loading' || authLoading) {
    return (
      <div className="bg-card flex flex-col items-center rounded-lg border p-8 shadow-sm">
        <Loader2 className="text-primary size-8 animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm">
          Aceitando convite...
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-card rounded-lg border p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold">Convite inválido</h2>
        <p className="text-muted-foreground mt-2 text-sm">{errorMessage}</p>
        <Button className="mt-4" onClick={() => router.push('/login')}>
          Ir para login
        </Button>
      </div>
    )
  }

  return null
}
