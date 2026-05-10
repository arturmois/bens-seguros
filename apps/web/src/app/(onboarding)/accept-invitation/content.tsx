'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { setActiveOrgCookie } from '@/lib/org-cookie'

import { fetchInvitation, resolveErrorVariant } from './invitation-api'
import { InvitationAcceptAsCurrent } from './invitation-accept-as-current'
import { InvitationError } from './invitation-error'
import { InvitationHeader } from './invitation-header'
import { InvitationLoginForm } from './invitation-login-form'
import { InvitationRegisterForm } from './invitation-register-form'
import { InvitationWrongAccount } from './invitation-wrong-account'
import type { PageState } from './invitation-types'

export function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const invitationId = searchParams.get('id')
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  useEffect(() => {
    if (!invitationId) {
      setState({ kind: 'error', variant: 'not_found' })
      return
    }
    fetchInvitation(invitationId)
      .then((invitation) => {
        if (invitation.currentSession) {
          const matches = invitation.currentSession.email === invitation.email
          setState({
            kind: matches ? 'accept-as-current' : 'wrong-account',
            invitation,
          })
          return
        }
        setState({
          kind: invitation.hasAccount ? 'login' : 'register',
          invitation,
        })
      })
      .catch((err: unknown) => {
        setState({ kind: 'error', variant: resolveErrorVariant(err) })
      })
  }, [invitationId])
  function handleSuccess(orgId: string) {
    setActiveOrgCookie(orgId)
    queryClient.clear()
    toast.success('Bem-vindo!', {
      description: 'Você entrou na organização com sucesso.',
    })
    router.push('/dashboard')
  }
  if (state.kind === 'loading') {
    return (
      <div className="bg-card flex flex-col items-center rounded-lg border p-8 shadow-sm">
        <Loader2 className="text-primary size-8 animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm">
          Carregando convite...
        </p>
      </div>
    )
  }
  if (state.kind === 'error') {
    return <InvitationError variant={state.variant} />
  }
  return (
    <div className="bg-card rounded-lg border p-8 shadow-sm">
      <InvitationHeader invitation={state.invitation} />
      {state.kind === 'register' && (
        <InvitationRegisterForm
          invitation={state.invitation}
          onSuccess={handleSuccess}
        />
      )}
      {state.kind === 'login' && (
        <InvitationLoginForm
          invitation={state.invitation}
          onSuccess={handleSuccess}
        />
      )}
      {state.kind === 'accept-as-current' && (
        <InvitationAcceptAsCurrent
          invitation={state.invitation}
          onSuccess={handleSuccess}
        />
      )}
      {state.kind === 'wrong-account' && (
        <InvitationWrongAccount invitation={state.invitation} />
      )}
    </div>
  )
}
